import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination, idField, splitData } from '../shared/descriptions';

const show = { resource: ['post'] };
const showCreate = { ...show, operation: ['create'] };
const showGetAll = { ...show, operation: ['getAll'] };

const POST_STATUSES = [
	{ name: 'Canceled', value: 'canceled' },
	{ name: 'Draft', value: 'draft' },
	{ name: 'Failed', value: 'failed' },
	{ name: 'Partial', value: 'partial' },
	{ name: 'Published', value: 'published' },
	{ name: 'Publishing', value: 'publishing' },
	{ name: 'Scheduled', value: 'scheduled' },
];

// A dateTime parameter has no offset; read it in the workflow's timezone.
const toIsoInWorkflowZone =
	'={{ $value ? DateTime.fromISO($value, { zone: $now.zoneName }).toISO() : undefined }}';

export const postDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				action: 'Cancel a scheduled post',
				description: 'Cancel a post that has not been published yet',
				routing: {
					request: { method: 'DELETE', url: '=/v1/posts/{{$parameter.postId}}' },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a post',
				description: 'Publish now or schedule a post to one or more accounts',
				routing: {
					request: { method: 'POST', url: '/v1/posts' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a post',
				description: 'Get a post with the status and link of each account',
				routing: {
					request: { method: 'GET', url: '=/v1/posts/{{$parameter.postId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'List posts made through Tebar',
				routing: {
					request: { method: 'GET', url: '/v1/posts' },
					output: splitData,
				},
			},
			{
				name: 'Retry',
				value: 'retry',
				action: 'Retry a failed post',
				description: 'Publish the failed accounts of a post again',
				routing: {
					request: { method: 'POST', url: '=/v1/posts/{{$parameter.postId}}/retry' },
				},
			},
		],
		default: 'create',
	},
	idField('Post ID', 'postId', { ...show, operation: ['cancel', 'get', 'retry'] }),

	// Create
	{
		displayName: 'Target Mode',
		name: 'targetMode',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showCreate },
		options: [
			{
				name: 'Select Accounts',
				value: 'accounts',
				description: 'Post the same text and media to the selected accounts',
			},
			{
				name: 'Targets JSON',
				value: 'json',
				description:
					'Write the targets array yourself, for per-account text, media, or platform options',
			},
		],
		default: 'accounts',
	},
	{
		displayName: 'Account Names or IDs',
		name: 'accountIds',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getAccounts' },
		required: true,
		default: [],
		displayOptions: { show: { ...showCreate, targetMode: ['accounts'] } },
		description:
			'Accounts to post to. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		routing: {
			send: {
				type: 'body',
				property: 'targets',
				value: '={{ [].concat($value).map((id) => ({ account_id: id })) }}',
			},
		},
	},
	{
		displayName: 'Targets',
		name: 'targetsJson',
		type: 'json',
		required: true,
		default: '[\n  { "account_id": "", "options": {} }\n]',
		displayOptions: { show: { ...showCreate, targetMode: ['json'] } },
		description:
			'Array of { account_id, content?, media_ids?, media_urls?, options? }. Options per platform are listed at https://docs.tebar.app. YouTube needs options.title and options.made_for_kids; Pinterest needs options.board_id.',
		routing: {
			send: {
				type: 'body',
				property: 'targets',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
	},
	{
		displayName: 'Text',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: showCreate },
		description: 'Caption or text of the post. Leave empty for a post with media only.',
		routing: {
			send: {
				type: 'body',
				property: 'content',
				value: '={{ $value || undefined }}',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showCreate },
		options: [
			{
				displayName: 'Idea ID',
				name: 'idea_id',
				type: 'string',
				default: '',
				description: 'Idea on the ideas board this post comes from',
				routing: { send: { type: 'body', property: 'idea_id' } },
			},
			{
				displayName: 'Idempotency Key',
				name: 'idempotencyKey',
				type: 'string',
				default: '',
				description:
					'1-128 characters of A-Z, a-z, 0-9, _ and -. Sending the same key and body again returns the first post instead of creating a new one.',
				routing: {
					request: { headers: { 'Idempotency-Key': '={{ $value }}' } },
				},
			},
			{
				displayName: 'Media IDs',
				name: 'media_ids',
				type: 'string',
				default: '',
				placeholder: 'e.g. 0b9d..., 7c2e...',
				description: 'Comma-separated IDs of media already uploaded to Tebar',
				routing: {
					send: {
						type: 'body',
						property: 'media_ids',
						value: '={{ $value.split(",").map((id) => id.trim()).filter((id) => id) }}',
					},
				},
			},
			{
				displayName: 'Media URLs',
				name: 'media_urls',
				type: 'string',
				typeOptions: { multipleValues: true, multipleValueButtonText: 'Add URL' },
				default: [],
				description:
					'Public URLs of photos or videos. Tebar downloads them before creating the post. Two or more items make a carousel.',
				routing: {
					send: {
						type: 'body',
						property: 'media_urls',
						value: '={{ $value.length ? $value : undefined }}',
					},
				},
			},
			{
				displayName: 'Schedule At',
				name: 'scheduled_at',
				type: 'dateTime',
				default: '',
				description:
					"When to publish, in the workflow's timezone unless the value has an offset. Leave empty to publish now.",
				routing: {
					send: { type: 'body', property: 'scheduled_at', value: toIsoInWorkflowZone },
				},
			},
		],
	},

	// Get Many
	...cursorPagination(showGetAll, 500),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showGetAll },
		options: [
			{
				displayName: 'Account Name or ID',
				name: 'account_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAccounts' },
				default: '',
				description:
					'Only posts to this account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'query', property: 'account_id' } },
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'query', property: 'from', value: toIsoInWorkflowZone } },
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{ name: 'Newest', value: 'newest' },
					{ name: 'Scheduled Time', value: 'scheduled' },
				],
				default: 'newest',
				routing: { send: { type: 'query', property: 'sort' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: POST_STATUSES,
				default: 'scheduled',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'query', property: 'to', value: toIsoInWorkflowZone } },
			},
		],
	},
];
