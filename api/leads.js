const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { GoogleAuth } = require("google-auth-library");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEGRAM_PATTERN = /^@[a-zA-Z0-9_]{5,32}$/;
const DEFAULT_ORIGIN = "https://misterkvadrat.github.io";

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  const allowedOrigin = getAllowedOrigin(request);

  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }

  if (request.method === "OPTIONS") {
    return response.status(allowedOrigin ? 204 : 403).end();
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST, OPTIONS");
    return response.status(405).json({ message: "Метод не поддерживается." });
  }

  if (!allowedOrigin) {
    return response.status(403).json({ message: "Источник запроса не разрешён." });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};

    if (body.website) {
      return response.status(201).json({ message: "Заявка принята. Я свяжусь с вами сам." });
    }

    const lead = createLead(body, request.headers.referer);
    await appendLead(lead);
    return response.status(201).json({ message: "Заявка принята. Я свяжусь с вами сам." });
  } catch (error) {
    if (error.code === "INVALID_CONTACT") {
      return response.status(400).json({ message: error.message });
    }

    console.error("Lead storage failed:", error.message);
    return response.status(500).json({ message: "Не удалось сохранить заявку. Попробуйте ещё раз позже." });
  }
};

function createLead(body, referer) {
  const parsed = parseContact(body.contact);

  if (!parsed) {
    const error = new Error("Укажите корректную почту или Telegram в формате @username.");
    error.code = "INVALID_CONTACT";
    throw error;
  }

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    contact: parsed.value,
    channel: parsed.channel,
    source: cleanText(body.source || referer || "direct", 500),
    status: "Новая",
  };
}

function parseContact(value) {
  const contact = cleanText(value, 254);
  if (!contact) return null;

  const telegramUrl = contact.match(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{5,32})\/?$/i);
  if (telegramUrl) return { value: `@${telegramUrl[1]}`, channel: "telegram" };
  if (TELEGRAM_PATTERN.test(contact)) return { value: contact, channel: "telegram" };
  if (EMAIL_PATTERN.test(contact)) return { value: contact, channel: "email" };
  return null;
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function getAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return "";

  try {
    if (new URL(origin).host === request.headers.host) return origin;
  } catch {
    return "";
  }

  const configured = (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGIN)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : "";
}

async function appendLead(lead) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const range = process.env.GOOGLE_SHEET_RANGE || "Leads!A:G";

  if (!spreadsheetId || !clientEmail || !privateKey) {
    throw new Error("Google Sheets environment variables are missing");
  }

  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append`;

  await client.request({
    url,
    method: "POST",
    params: { valueInputOption: "RAW", insertDataOption: "INSERT_ROWS" },
    data: {
      values: [[
        lead.id,
        lead.createdAt,
        safeSheetValue(lead.contact),
        lead.channel,
        safeSheetValue(lead.source),
        lead.status,
        "",
      ]],
    },
  });
}

function safeSheetValue(value) {
  return /^[=+\-]/.test(value) ? `'${value}` : value;
}

if (require.main === module) {
  assert.deepEqual(parseContact("user@example.com"), { value: "user@example.com", channel: "email" });
  assert.deepEqual(parseContact("@worcline_user"), { value: "@worcline_user", channel: "telegram" });
  assert.deepEqual(parseContact("https://t.me/worcline_user"), { value: "@worcline_user", channel: "telegram" });
  assert.equal(parseContact("telegram"), null);
  assert.equal(safeSheetValue("=IMPORTXML()"), "'=IMPORTXML()");
  console.log("Lead validation checks passed");
}
