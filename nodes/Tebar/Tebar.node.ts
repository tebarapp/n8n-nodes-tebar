import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { getAccounts, searchAccounts } from './methods/accounts';
import { accountDescription } from './resources/account';
import { commentDescription } from './resources/comment';
import { mediaDescription } from './resources/media';
import { postDescription } from './resources/post';

export class Tebar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tebar',
		name: 'tebar',
		icon: { light: 'file:../../icons/tebar.svg', dark: 'file:../../icons/tebar.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Publish and schedule posts to Threads, Instagram, TikTok, YouTube, LinkedIn, X, Facebook, Pinterest, Telegram and Discord with Tebar',
		defaults: {
			name: 'Tebar',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'tebarApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Media', value: 'media' },
					{ name: 'Post', value: 'post' },
				],
				default: 'post',
			},
			...accountDescription,
			...commentDescription,
			...mediaDescription,
			...postDescription,
		],
	};

	methods = {
		loadOptions: {
			getAccounts,
		},
		listSearch: {
			searchAccounts,
		},
	};
}
