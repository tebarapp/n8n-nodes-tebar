# n8n-nodes-tebar

This is an n8n community node package for [Tebar](https://tebar.app). It lets you publish and schedule social media posts, manage your media library, answer comments, and start workflows from Tebar events.

Tebar posts to Threads, Instagram, Facebook Pages, TikTok, YouTube, LinkedIn, X, Pinterest, Telegram, and Discord from one API.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Tebar Trigger](#tebar-trigger)
- [Usage](#usage)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-tebar`.

## Credentials

1. Sign up at [tebar.app](https://tebar.app) and connect your social media accounts.
2. In the Tebar dashboard, open [**API key**](https://publish.tebar.app/api-keys) in the sidebar and create a key (`tb_live_...`). Give it the write scope to create posts, upload media, and reply to comments.
3. In n8n, create a **Tebar API** credential and paste the key.

| Field    | Description                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API Key  | Your Tebar API key.                                                                                                                                                                |
| Profile  | Optional. ID or external ID of one Tebar profile (one client or brand). Leave empty to reach every profile of an owner key; new posts and uploads then go to your default profile. |
| Base URL | Leave as `https://api.tebar.app`.                                                                                                                                                  |

A key created for a single profile only sees that profile. The Tebar Trigger needs an owner key (not limited to one profile), because only owner keys can create webhooks.

## Operations

**Account**

- Get: one connected account
- Get Many: all connected accounts

**Post**

- Create: publish now or schedule to one or more accounts
- Get: a post with the status and link of each account
- Get Many: posts made through Tebar, filtered by status, account, and time
- Cancel: a post that has not been published yet
- Retry: publish the failed accounts of a post again

**Media**

- Upload: a photo or video from a binary field (up to 100 MB)
- Upload From URL: Tebar downloads a public photo or video
- Get, Get Many, Delete

**Comment**

- Get, Get Many (for example, only unreplied comments)
- Reply: reply in public as the account that owns the post
- Hide: hide or unhide a comment

Comment text is written by other people. If you pass it to an AI model, treat it as data, not instructions.

### Creating posts

- **Select Accounts** posts the same text and media to every selected account.
- **Targets JSON** lets you write the `targets` array yourself, for per-account text and media or platform options such as a Threads poll, an Instagram story, or a YouTube title:

```json
[
	{ "account_id": "th...", "options": { "poll": { "options": ["Tubruk", "Susu"] } } },
	{ "account_id": "yt...", "options": { "title": "New menu", "made_for_kids": false } }
]
```

YouTube needs `title` and `made_for_kids`, and Pinterest needs `board_id`. See the [Tebar API reference](https://docs.tebar.app/reference) for every option.

**Schedule At** is read in the workflow's timezone unless the value has an offset. Leave it empty to publish now. Set an **Idempotency Key** when a workflow might run twice for the same post: Tebar then returns the first post instead of creating another.

## Tebar Trigger

The trigger starts a workflow when something happens in Tebar:

- `post.published`, `post.failed` (one event per account)
- `comment.created`, `comment.replied`, `comment.hidden`, `comment.unhidden`, `comment.deleted`
- `message.received`, `message.sent` (Instagram DMs)
- `account.connected`, `account.expired`, `account.disconnected`
- `automation.run`, `profile.deleted`

When you activate the workflow, the node creates a webhook in Tebar for the chosen events. When you deactivate it, the node deletes the webhook. Each delivery's `Tebar-Signature` is checked with the webhook's secret, and deliveries that fail the check are rejected.

Tebar only delivers to `https` URLs on port 443 with a public host. n8n Cloud works as is. For self-hosted n8n, set `WEBHOOK_URL` to your public https address. Events can arrive more than once, so use the event `id` to skip duplicates.

## Usage

Ready-to-import workflows are in [`examples/`](examples). In n8n, open a new workflow, choose **⋯ → Import from URL**, and paste the file's raw link. Each one has a note with the fields to fill in.

| Workflow                                                             | What it does                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Post from a form](examples/form-to-post.json)                       | An n8n form takes a caption and one photo or video, uploads the file to Tebar, and posts it           |
| [RSS to social](examples/rss-to-post.json)                           | Every hour, each new feed item becomes a post with its title and link                                 |
| [Failed post alert](examples/failed-post-alert.json)                 | Tebar Trigger (`post.failed`) sends a Telegram message with the platform and the reason               |
| [Unreplied comments digest](examples/unreplied-comments-digest.json) | Every morning, Telegram gets the 20 newest comments waiting for a reply (nothing when there are none) |

Raw link format: `https://raw.githubusercontent.com/tebarapp/n8n-nodes-tebar/main/examples/<file>.json`.

The Telegram examples send in HTML mode and escape comment text, because n8n's Telegram node uses Markdown by default and a username such as `a_b` would make Telegram reject the message.

The Tebar node can also be used as a tool by n8n AI agents.

## Compatibility

Built with `@n8n/node-cli` and tested on n8n 2.47.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Tebar documentation](https://docs.tebar.app)
- [Tebar API reference](https://docs.tebar.app/reference)
