#!/usr/bin/env node
// Thin client for the official Telegram Bot API — a bot account (created
// via @BotFather), never a personal user session. Credentials from env
// only, same rule as instagram-client.mjs.
//
// Required env: TELEGRAM_BOT_TOKEN
// Optional env: TELEGRAM_DEFAULT_CHAT_ID, DRY_RUN=1
//
// Usage:
//   node telegram-client.mjs send-message --chat-id <id> --text "..."
//   node telegram-client.mjs send-photo --chat-id <id> --photo-url <url> [--caption "..."]
//   node telegram-client.mjs get-updates [--offset <id>]
//   node telegram-client.mjs reply --chat-id <id> --message-id <id> --text "..."
//   node telegram-client.mjs get-member-count --chat-id <id>

const BASE = (token) => `https://api.telegram.org/bot${token}`;

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

async function call(method, params = {}) {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const url = `${BASE(token)}/${method}`;

  if (process.env.DRY_RUN === "1") {
    return { ok: true, dryRun: true, wouldCall: { method, url: url.replace(token, "***"), params } };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    return { ok: false, status: res.status, error: json.description ?? JSON.stringify(json) };
  }
  return { ok: true, data: json.result };
}

async function sendMessage({ "chat-id": chatId, text }) {
  const resolvedChatId = chatId ?? process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!resolvedChatId || !text) throw new Error("send-message requires --chat-id (or TELEGRAM_DEFAULT_CHAT_ID) and --text");
  return call("sendMessage", { chat_id: resolvedChatId, text, parse_mode: "HTML" });
}

async function sendPhoto({ "chat-id": chatId, "photo-url": photoUrl, caption }) {
  const resolvedChatId = chatId ?? process.env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!resolvedChatId || !photoUrl) throw new Error("send-photo requires --chat-id (or TELEGRAM_DEFAULT_CHAT_ID) and --photo-url");
  return call("sendPhoto", { chat_id: resolvedChatId, photo: photoUrl, caption: caption ?? "" });
}

async function getUpdates({ offset }) {
  return call("getUpdates", offset ? { offset: Number(offset) } : {});
}

async function reply({ "chat-id": chatId, "message-id": messageId, text }) {
  if (!chatId || !messageId || !text) throw new Error("reply requires --chat-id, --message-id, and --text");
  return call("sendMessage", { chat_id: chatId, text, reply_to_message_id: Number(messageId), parse_mode: "HTML" });
}

async function getMemberCount({ "chat-id": chatId }) {
  if (!chatId) throw new Error("get-member-count requires --chat-id");
  return call("getChatMemberCount", { chat_id: chatId });
}

const HANDLERS = {
  "send-message": sendMessage,
  "send-photo": sendPhoto,
  "get-updates": getUpdates,
  reply,
  "get-member-count": getMemberCount,
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
