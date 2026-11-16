import type { INodeProperties } from 'n8n-workflow';
import { accountLocator, splitData } from '../shared/descriptions';

const show = { resource: ['account'] };

export const accountDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an account',
				description: 'Get a connected social media account',
				routing: {
					request: {
						method: 'GET',
						url: '=/v1/accounts/{{$parameter.accountId}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many accounts',
				description: 'List the connected social media accounts',
				routing: {
					request: {
						method: 'GET',
						url: '/v1/accounts',
					},
					output: splitData,
				},
			},
		],
		default: 'getAll',
	},
	{
		...accountLocator,
		displayOptions: { show: { ...show, operation: ['get'] } },
	},
];
