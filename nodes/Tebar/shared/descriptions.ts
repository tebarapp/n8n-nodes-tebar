import type { IDataObject, INodeProperties } from 'n8n-workflow';

const UUID_REGEX = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export const accountLocator: INodeProperties = {
	displayName: 'Account',
	name: 'accountId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select an account...',
			typeOptions: {
				searchListMethod: 'searchAccounts',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 0b9d2f4e-1c3a-4e5b-8f7a-9d6c5b4a3e21',
			validation: [
				{
					type: 'regex',
					properties: { regex: UUID_REGEX, errorMessage: 'Not a valid Tebar account ID' },
				},
			],
		},
	],
};

export function idField(
	displayName: string,
	name: string,
	show: Record<string, string[]>,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 0b9d2f4e-1c3a-4e5b-8f7a-9d6c5b4a3e21',
		displayOptions: { show },
	};
}

// Tebar lists are cursor-paginated: { data, next_cursor }.
export function cursorPagination(
	show: Record<string, string[]>,
	maxLimit: number,
): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: { show },
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			routing: {
				send: {
					paginate: '={{ $value }}',
					type: 'query',
					property: 'limit',
					value: String(maxLimit),
				},
				operations: {
					pagination: {
						type: 'generic',
						properties: {
							continue: '={{ !!$response.body.next_cursor }}',
							// n8n replaces the whole qs with this one, so keep the filters and limit.
							request: {
								qs: '={{ Object.assign({}, $request.qs, $response.body?.next_cursor ? { cursor: $response.body.next_cursor } : {}) }}' as unknown as IDataObject,
							},
						},
					},
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: { show: { ...show, returnAll: [false] } },
			typeOptions: { minValue: 1, maxValue: maxLimit },
			default: 50,
			description: 'Max number of results to return',
			routing: {
				send: {
					type: 'query',
					property: 'limit',
				},
				output: {
					maxResults: '={{ $value }}',
				},
			},
		},
	];
}

export const splitData = {
	postReceive: [
		{
			type: 'rootProperty' as const,
			properties: { property: 'data' },
		},
	],
};
