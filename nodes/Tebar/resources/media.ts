import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { cursorPagination, idField, splitData } from '../shared/descriptions';

const show = { resource: ['media'] };
const showUpload = { ...show, operation: ['upload'] };
const showFromUrl = { ...show, operation: ['uploadFromUrl'] };
const showGetAll = { ...show, operation: ['getAll'] };

const keepField: INodeProperties = {
	displayName: 'Keep in Library',
	name: 'keep',
	type: 'boolean',
	default: false,
	description:
		'Whether to keep the file in the media library. Otherwise Tebar removes it some days after its posts are done (7 days if never used).',
};

// POST /v1/media/upload takes the raw file bytes; Tebar reads the type from the bytes.
async function sendBinaryBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const propertyName = this.getNodeParameter('binaryPropertyName') as string;
	const binaryData = this.helpers.assertBinaryData(propertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(propertyName);

	requestOptions.body = buffer;
	requestOptions.headers = {
		...requestOptions.headers,
		'Content-Type': binaryData.mimeType || 'application/octet-stream',
		'Content-Length': buffer.length,
	};
	requestOptions.qs = {
		...requestOptions.qs,
		...(binaryData.fileName ? { name: binaryData.fileName } : {}),
	};
	requestOptions.json = false;
	requestOptions.returnFullResponse = false;
	return requestOptions;
}

export const mediaDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a media file',
				description: 'Delete a file from the media library',
				routing: {
					request: { method: 'DELETE', url: '=/v1/media/{{$parameter.mediaId}}' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a media file',
				routing: {
					request: { method: 'GET', url: '=/v1/media/{{$parameter.mediaId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many media files',
				description: 'List the media library',
				routing: {
					request: { method: 'GET', url: '/v1/media' },
					output: splitData,
				},
			},
			{
				name: 'Upload',
				value: 'upload',
				action: 'Upload a file',
				description: 'Upload a photo or video from a binary property (up to 100 MB)',
				routing: {
					request: { method: 'POST', url: '/v1/media/upload' },
					send: { preSend: [sendBinaryBody] },
					output: {
						postReceive: [
							async function (this, items) {
								return items.map((item) => ({
									json:
										typeof item.json === 'string'
											? JSON.parse(item.json as unknown as string)
											: item.json,
								}));
							},
						],
					},
				},
			},
			{
				name: 'Upload From URL',
				value: 'uploadFromUrl',
				action: 'Upload a file from a URL',
				description: 'Let Tebar download a photo or video from a public URL',
				routing: {
					request: { method: 'POST', url: '/v1/media/from-url' },
				},
			},
		],
		default: 'upload',
	},
	idField('Media ID', 'mediaId', { ...show, operation: ['delete', 'get'] }),

	// Upload
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: { show: showUpload },
		hint: 'The name of the input binary field containing the file to upload',
	},
	{
		...keepField,
		displayOptions: { show: showUpload },
		routing: { send: { type: 'query', property: 'keep', value: '={{ String($value) }}' } },
	},

	// Upload from URL
	{
		...keepField,
		displayOptions: { show: showFromUrl },
		routing: { send: { type: 'body', property: 'keep' } },
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/photo.jpg',
		displayOptions: { show: showFromUrl },
		routing: { send: { type: 'body', property: 'url' } },
	},

	// Get Many
	...cursorPagination(showGetAll, 100),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showGetAll },
		options: [
			{
				displayName: 'File Name',
				name: 'original_name',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'original_name' } },
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Image', value: 'image' },
					{ name: 'Video', value: 'video' },
				],
				default: 'image',
				routing: { send: { type: 'query', property: 'type' } },
			},
		],
	},
];
