import { createHmac, timingSafeEqual } from 'crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { tebarApiRequest } from '../Tebar/shared/transport';

// Docs: https://docs.tebar.app (outbound webhooks; signature t=<unix>,v1=<hex> of "<t>.<raw body>")
const SIGNATURE_TOLERANCE_SECONDS = 300;

const EVENTS = [
	{ name: 'Account Connected', value: 'account.connected' },
	{ name: 'Account Disconnected', value: 'account.disconnected' },
	{ name: 'Account Expired', value: 'account.expired', description: 'Needs to be connected again' },
	{ name: 'Automation Run', value: 'automation.run' },
	{ name: 'Comment Created', value: 'comment.created' },
	{ name: 'Comment Deleted', value: 'comment.deleted' },
	{ name: 'Comment Hidden', value: 'comment.hidden' },
	{ name: 'Comment Replied', value: 'comment.replied' },
	{ name: 'Comment Unhidden', value: 'comment.unhidden' },
	{ name: 'Message Received', value: 'message.received', description: 'Instagram DM' },
	{ name: 'Message Sent', value: 'message.sent', description: 'Instagram DM' },
	{ name: 'Post Failed', value: 'post.failed', description: 'Per account, after the last try' },
	{ name: 'Post Published', value: 'post.published', description: 'Per account' },
	{ name: 'Profile Deleted', value: 'profile.deleted' },
];

type WebhookEndpoint = {
	id: string;
	url: string;
	events: string[];
	profile_id: string | null;
	active: boolean;
	secret?: string;
};

function isNotFound(error: unknown): boolean {
	const e = error as { httpCode?: string; response?: { status?: number } };
	return e.httpCode === '404' || e.response?.status === 404;
}

function sameEvents(a: string[], b: string[]): boolean {
	return a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
}

function validSignature(secret: string, header: string, rawBody: string): boolean {
	const parts = Object.fromEntries(
		header.split(',').map((part) => {
			const index = part.indexOf('=');
			return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
		}),
	);
	const t = Number(parts.t);
	const v1 = parts.v1;
	if (!Number.isFinite(t) || !v1) return false;
	if (Math.abs(Date.now() / 1000 - t) > SIGNATURE_TOLERANCE_SECONDS) return false;
	const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex');
	const a = Buffer.from(expected);
	const b = Buffer.from(v1);
	return a.length === b.length && timingSafeEqual(a, b);
}

export class TebarTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Tebar Trigger',
		name: 'tebarTrigger',
		icon: { light: 'file:../../icons/tebar.svg', dark: 'file:../../icons/tebar.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when something happens in Tebar',
		defaults: {
			name: 'Tebar Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'tebarApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Tebar only sends events to https URLs on port 443 with a public host, and needs an owner API key (a key limited to one profile cannot create webhooks)',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				options: EVENTS,
				default: ['post.published', 'post.failed'],
			},
			{
				displayName: 'Profile ID',
				name: 'profileId',
				type: 'string',
				default: '',
				description:
					'Only receive events of this profile (ID or external ID). Leave empty for every profile.',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;
				if (!webhookId) return false;

				let endpoint: WebhookEndpoint;
				try {
					endpoint = (await tebarApiRequest.call(
						this,
						'GET',
						`/v1/webhooks/${webhookId}`,
					)) as WebhookEndpoint;
				} catch (error) {
					if (isNotFound(error)) {
						delete staticData.webhookId;
						delete staticData.webhookSecret;
						return false;
					}
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				const url = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				if (
					endpoint.active &&
					endpoint.url === url &&
					sameEvents(endpoint.events, events) &&
					staticData.webhookSecret
				) {
					return true;
				}

				// Settings changed or Tebar turned it off after failed deliveries: start over.
				await tebarApiRequest.call(this, 'DELETE', `/v1/webhooks/${webhookId}`);
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default');
				const events = this.getNodeParameter('events') as string[];
				const profileId = (this.getNodeParameter('profileId') as string).trim();

				const body: IDataObject = { url, events };
				if (profileId) body.profile_id = profileId;

				let endpoint: WebhookEndpoint;
				try {
					endpoint = (await tebarApiRequest.call(
						this,
						'POST',
						'/v1/webhooks',
						body,
					)) as WebhookEndpoint;
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = endpoint.id;
				staticData.webhookSecret = endpoint.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;
				if (webhookId) {
					try {
						await tebarApiRequest.call(this, 'DELETE', `/v1/webhooks/${webhookId}`);
					} catch (error) {
						if (!isNotFound(error)) return false;
					}
				}
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const res = this.getResponseObject();
		const secret = this.getWorkflowStaticData('node').webhookSecret as string | undefined;
		const signature = this.getHeaderData()['tebar-signature'] as string | undefined;
		const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody?.toString('utf8');

		if (
			!secret ||
			!signature ||
			rawBody === undefined ||
			!validSignature(secret, signature, rawBody)
		) {
			res.status(401).json({ error: 'invalid_signature' });
			return { noWebhookResponse: true };
		}

		const event = this.getBodyData();
		const events = this.getNodeParameter('events') as string[];
		if (!events.includes(event.type as string)) {
			return { webhookResponse: 'ignored' };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(event)],
		};
	}
}
