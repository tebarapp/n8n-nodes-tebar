import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination, idField, splitData } from '../shared/descriptions';

const show = { resource: ['comment'] };
const showGetAll = { ...show, operation: ['getAll'] };

export const commentDescription: INodeProperties[] = [
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
				action: 'Get a comment',
				routing: {
					request: { method: 'GET', url: '=/v1/comments/{{$parameter.commentId}}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many comments',
				description: 'List comments on the posts of your accounts',
				routing: {
					request: { method: 'GET', url: '/v1/comments' },
					output: splitData,
				},
			},
			{
				name: 'Hide',
				value: 'hide',
				action: 'Hide or unhide a comment',
				routing: {
					request: { method: 'POST', url: '=/v1/comments/{{$parameter.commentId}}/hide' },
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to a comment',
				description: 'Reply in public as the account that owns the post',
				routing: {
					request: { method: 'POST', url: '=/v1/comments/{{$parameter.commentId}}/reply' },
				},
			},
		],
		default: 'getAll',
	},
	idField('Comment ID', 'commentId', { ...show, operation: ['get', 'hide', 'reply'] }),
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: { show: { ...show, operation: ['reply'] } },
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Hidden',
		name: 'hidden',
		type: 'boolean',
		default: true,
		displayOptions: { show: { ...show, operation: ['hide'] } },
		description: 'Whether to hide the comment. Turn off to show it again.',
		routing: { send: { type: 'body', property: 'hidden' } },
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
				displayName: 'Account Name or ID',
				name: 'account_id',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAccounts' },
				default: '',
				description:
					'Only comments on this account. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'query', property: 'account_id' } },
			},
			{
				displayName: 'Post ID',
				name: 'post_id',
				type: 'string',
				default: '',
				description: 'Only comments on this Tebar post',
				routing: { send: { type: 'query', property: 'post_id' } },
			},
			{
				displayName: 'Reply Status',
				name: 'reply_status',
				type: 'options',
				options: [
					{ name: 'Ignored', value: 'ignored' },
					{ name: 'Replied', value: 'replied' },
					{ name: 'Unreplied', value: 'unreplied' },
				],
				default: 'unreplied',
				routing: { send: { type: 'query', property: 'reply_status' } },
			},
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'options',
				options: [
					{ name: 'Most Likes', value: 'likes' },
					{ name: 'Newest', value: 'newest' },
				],
				default: 'newest',
				routing: { send: { type: 'query', property: 'sort' } },
			},
		],
	},
];
