---
name: social-media-manager
description: Building blocks for managing an Instagram Business/Creator account and a Telegram bot from a brand profile — scheduled on-brand posting, drafting replies to comments/DMs with safety boundaries, and pulling stats. Uses only official, ToS-compliant APIs (Instagram Graph API, Telegram Bot API) — never credential-based/unofficial automation. Use when the user asks to manage, automate, or schedule posts/replies for an Instagram or Telegram business account, or to set up a social-media persona/profile.
---

# Social Media Manager

Scaffolding for persona-driven Instagram + Telegram management, built on the official Graph API (Instagram) and Bot API (Telegram) only — never a reverse-engineered/unofficial client. This is deliberately scoped to the reusable building blocks: a profile format, two API clients, and the drafting/safety workflow. **Scheduling the actual recurring runs and standing up any always-on reply listener is out of scope here** — that's a separate project the user is building; this skill is what that project (or an on-demand Claude session) calls into.

## Why only the official APIs

- **Instagram**: only a Business or Creator account linked to a Facebook Page, through a Meta Developer App with a Page Access Token, is ToS-compliant. Automating a regular consumer account (login-based, browser automation, unofficial libraries) violates Instagram's Platform Policy and risks a permanent ban — never build or suggest that path, even if asked for "something simpler."
- **Telegram**: a bot account created via @BotFather, through the Bot API. Automating a *personal* user session (MTProto) is a greyer area prone to spam-detection limits — out of scope here on purpose.

## Setup (the user does this themselves — never ask them to paste a token into chat)

1. **Instagram**: convert to a Business/Creator account, link a Facebook Page, create a Meta Developer App at developers.facebook.com, generate a long-lived **Page Access Token** with `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages` — some of these need Meta App Review before they work outside development mode; say so plainly if the user hits that wall, don't imply there's a way around it.
2. **Telegram**: message @BotFather, `/newbot`, get the bot token.
3. Store both as environment variables (`INSTAGRAM_PAGE_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `TELEGRAM_BOT_TOKEN`) — never in a committed file, never typed into this conversation.

## The profile

A JSON file describing the brand voice (`example-profile.json` in this skill is a filled-in template). Required fields: `businessName`, `language`, `tone`, `topics`, `boundaries` — **`boundaries` is the safety-critical field**: explicit things the auto-reply/content-generation must never do (promise a specific price, respond to complaints, discuss competitors, etc.). Validate before using one:

```
node scripts/validate-profile.mjs --profile <path>
```

Fails loudly if a required field — especially `boundaries` — is missing, rather than silently generating content with no guardrails.

## The two API clients

Both are plain Node scripts (built-in `fetch`, zero npm dependencies), read credentials from env only, and support `DRY_RUN=1` to print exactly what HTTP call *would* be made without making it — use dry-run to test a flow before real credentials exist, or before trusting a newly-written prompt/caption against a live account.

```
node scripts/instagram-client.mjs <command> [--flags]
  publish-photo --image-url <url> --caption "..."   # 2-step: create container, then publish
  get-comments --media-id <id>
  reply-comment --comment-id <id> --message "..."
  get-conversations
  get-messages --conversation-id <id>
  send-message --recipient-id <id> --text "..."
  get-insights [--metrics impressions,reach,profile_views] [--period day]

node scripts/telegram-client.mjs <command> [--flags]
  send-message --chat-id <id> --text "..."
  send-photo --chat-id <id> --photo-url <url> [--caption "..."]
  get-updates [--offset <id>]
  reply --chat-id <id> --message-id <id> --text "..."
  get-member-count --chat-id <id>
```

Both verified end-to-end in dry-run mode against every command (correct endpoints/params for the real Graph API and Bot API shapes, token properly masked in output, missing-credential case fails with a clear message rather than a stack trace).

## Workflow

1. **Load and validate the profile.** Refuse to generate content/replies without one that passes validation.
2. **Scheduled posting**: draft a caption/message matching the profile's `tone` and `topics` (use `exampleCaptions` as the style anchor), confirm it doesn't cross any `boundaries`, then call `publish-photo` (Instagram) / `send-message`-or-`send-photo` (Telegram). An actual image still has to come from somewhere — this skill doesn't generate images; pair with an image-generation tool/plugin if the post needs one, or use a user-supplied URL.
3. **Replies**: fetch new comments/messages (`get-comments`/`get-updates`), and for each, draft a reply in the profile's voice — **unless it matches a `boundaries` entry, in which case don't auto-reply: surface it to the user/`escalationContact` instead.** Never auto-send something the profile explicitly said not to.
4. **Stats**: `get-insights` (Instagram) gives real metrics; Telegram's Bot API only exposes `get-member-count` natively — say so rather than implying richer analytics exist that the Bot API doesn't actually provide.
5. **Report what was dry-run vs. actually sent** — never claim something posted/replied if `DRY_RUN` was on, or if credentials were missing and the call never went out.

## Explicitly out of scope here

- Making this run unattended on a schedule (Claude Code's `schedule`/cron-routine feature, or a separately deployed always-on service) — the user said this piece belongs in a different project.
- Image/video generation for posts.
- Any Instagram automation path other than the official Graph API (see "Why only the official APIs" — this isn't a missing feature, it's a deliberate boundary).
