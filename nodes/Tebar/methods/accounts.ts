import type {
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { tebarApiRequest } from '../shared/transport';

type TebarAccount = {
	id: string;
	platform: string;
	username: string | null;
	display_name: string | null;
	status: string;
};

const PLATFORM_NAMES: Record<string, string> = {
	threads: 'Threads',
	instagram: 'Instagram',
	facebook: 'Facebook',
	tiktok: 'TikTok',
	linkedin: 'LinkedIn',
	youtube: 'YouTube',
	x: 'X',
	telegram: 'Telegram',
	discord: 'Discord',
	pinterest: 'Pinterest',
};

function accountLabel(account: TebarAccount): string {
	const platform = PLATFORM_NAMES[account.platform] ?? account.platform;
	const name = account.username ? `@${account.username}` : (account.display_name ?? account.id);
	const status = account.status === 'active' ? '' : ` (${account.status})`;
	return `${platform}: ${name}${status}`;
}

async function listAccounts(this: ILoadOptionsFunctions): Promise<TebarAccount[]> {
	const response = (await tebarApiRequest.call(this, 'GET', '/v1/accounts')) as {
		data: TebarAccount[];
	};
	return response.data;
}

export async function getAccounts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const accounts = await listAccounts.call(this);
	return accounts
		.map((account) => ({ name: accountLabel(account), value: account.id }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchAccounts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const accounts = await listAccounts.call(this);
	const query = filter?.toLowerCase() ?? '';
	const results = accounts
		.map((account) => ({ name: accountLabel(account), value: account.id }))
		.filter((item) => !query || item.name.toLowerCase().includes(query))
		.sort((a, b) => a.name.localeCompare(b.name));
	return { results };
}
