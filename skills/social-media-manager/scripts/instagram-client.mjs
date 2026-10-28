#!/usr/bin/env node
// Thin client for the official Instagram Graph API (Business/Creator
// accounts only — this is the ToS-compliant path; there is no "consumer
// account automation" mode here on purpose). Reads credentials from env,
// never from arguments or files, so a token can never land in a log or a
// committed file by accident.
//
// Required env: INSTAGRAM_PAGE_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
// Optional env: INSTAGRAM_API_VERSION (default v21.0), DRY_RUN=1
//
// Usage:
//   node instagram-client.mjs publish-photo --image-url <url> --caption "..."
//   node instagram-client.mjs get-comments --media-id <id>
//   node instagram-client.mjs reply-comment --comment-id <id> --message "..."
//   node instagram-client.mjs get-conversations
//   node instagram-client.mjs get-messages --conversation-id <id>
//   node instagram-client.mjs send-message --recipient-id <id> --text "..."
//   node instagram-client.mjs get-insights [--metrics impressions,reach,profile_views] [--period day]

const API_VERSION = process.env.INSTAGRAM_API_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${API_VERSION}`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const out = { command };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]?.replace(/^--/, "");
    if (key) out[key] = rest[i + 1];
  }
  return out;
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} — set it before running (never pass a token as a CLI argument).`);
  return v;
}

async function call(method, path, params = {}) {
  const token = requireEnv("INSTAGRAM_PAGE_ACCESS_TOKEN");
  const url = new URL(`${BASE}${path}`);
  const body = { ...params, access_token: token };

  if (process.env.DRY_RUN === "1") {
    return { ok: true, dryRun: true, wouldCall: { method, url: url.toString().replace(token, "***"), body: { ...body, access_token: "***" } } };
  }

  let res;
  if (method === "GET") {
    for (const [k, v] of Object.entries(body)) url.searchParams.set(k, v);
    res = await fetch(url, { method: "GET" });
  } else {
    res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: json.error?.message ?? JSON.stringify(json) };
  }
  return { ok: true, data: json };
}

async function publishPhoto({ "image-url": imageUrl, caption }) {
  const igUserId = requireEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (!imageUrl) throw new Error("publish-photo requires --image-url (must be a publicly reachable URL)");
  const created = await call("POST", `/${igUserId}/media`, { image_url: imageUrl, caption: caption ?? "" });
  if (!created.ok) return created;
  if (created.dryRun) return created;
  const creationId = created.data.id;
  return call("POST", `/${igUserId}/media_publish`, { creation_id: creationId });
}

async function getComments({ "media-id": mediaId }) {
  if (!mediaId) throw new Error("get-comments requires --media-id");
  return call("GET", `/${mediaId}/comments`, { fields: "id,text,username,timestamp" });
}

async function replyComment({ "comment-id": commentId, message }) {
  if (!commentId || !message) throw new Error("reply-comment requires --comment-id and --message");
  return call("POST", `/${commentId}/replies`, { message });
}

async function getConversations() {
  const igUserId = requireEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  return call("GET", `/${igUserId}/conversations`, { platform: "instagram" });
}

async function getMessages({ "conversation-id": conversationId }) {
  if (!conversationId) throw new Error("get-messages requires --conversation-id");
  return call("GET", `/${conversationId}`, { fields: "messages{id,from,to,message,created_time}" });
}

async function sendMessage({ "recipient-id": recipientId, text }) {
  if (!recipientId || !text) throw new Error("send-message requires --recipient-id and --text");
  return call("POST", `/me/messages`, { recipient: { id: recipientId }, message: { text } });
}

async function getInsights({ metrics = "impressions,reach,profile_views", period = "day" }) {
  const igUserId = requireEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  return call("GET", `/${igUserId}/insights`, { metric: metrics, period });
}

const HANDLERS = {
  "publish-photo": publishPhoto,
  "get-comments": getComments,
  "reply-comment": replyComment,
  "get-conversations": getConversations,
  "get-messages": getMessages,
  "send-message": sendMessage,
  "get-insights": getInsights,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const handler = HANDLERS[args.command];
  if (!handler) {
    console.log(JSON.stringify({ ok: false, error: `Unknown command "${args.command}". Known: ${Object.keys(HANDLERS).join(", ")}` }));
    process.exitCode = 1;
    return;
  }
  try {
    const result = await handler(args);
    console.log(JSON.stringify(result, null, 2));
    if (result.ok === false) process.exitCode = 1;
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
    process.exitCode = 1;
  }
}

main();
