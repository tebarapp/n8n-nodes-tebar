import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TebarApi implements ICredentialType {
	name = 'tebarApi';

	displayName = 'Tebar API';

	icon: Icon = { light: 'file:../icons/tebar.svg', dark: 'file:../icons/tebar.dark.svg' };

	documentationUrl = 'https://docs.tebar.app';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'tb_live_...',
			description: 'Create one at https://publish.tebar.app/api-keys',
		},
		{
			displayName: 'Profile',
			name: 'profile',
			type: 'string',
			default: '',
			placeholder: 'e.g. 3f2b... or client-42',
			description:
				'Optional. ID or external ID of the Tebar profile to work in. Leave empty to reach every profile of an owner key (new posts and uploads go to the default profile).',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.tebar.app',
			description: 'Change only when told to by Tebar support',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'Tebar-Profile': '={{$credentials.profile}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/+$/, "")}}',
			url: '/v1/me',
			method: 'GET',
		},
	};
}
