import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const PORT = Number(process.env.PORT || 3000);
const PAYPAL_BASE_URL = process.env.PAYPAL_ENV === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || "http://localhost:3000";
const COURSE_PRICES = Object.freeze({
  "html-css": "198.00",
  javascript: "248.00",
  wordpress: "228.00"
});
const sessions = new Map();

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32_768) request.destroy(new Error("request body too large"));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function paypalToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) throw new Error(`PayPal authentication failed: ${response.status}`);
  return (await response.json()).access_token;
}

async function paypalRequest(path, options = {}) {
  const token = await paypalToken();
  const response = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`PayPal request failed: ${response.status}`);
  return body;
}

function requirePayPal() {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("PayPal is not configured");
}

async function createOrder(request, response) {
  const body = JSON.parse(await readBody(request));
  const courseId = body.courseId;
  const price = COURSE_PRICES[courseId];
  if (!price) return json(response, 400, { error: "不正な講座です" });
  requirePayPal();
  const order = await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    headers: { "PayPal-Request-Id": randomBytes(16).toString("hex") },
    body: JSON.stringify({
      intent: "CAPTURE",
      application_context: {
        return_url: `${PUBLIC_APP_URL}/?paypal=success`,
        cancel_url: `${PUBLIC_APP_URL}/?paypal=cancel`
      },
      purchase_units: [{ reference_id: courseId, amount: { currency_code: "JPY", value: String(Math.round(Number(price) * 100)) } }]
    })
  });
  const approval = order.links?.find((link) => link.rel === "approve")?.href;
  if (!approval) throw new Error("PayPal approval URL missing");
  sessions.set(order.id, { courseId, createdAt: Date.now() });
  return json(response, 200, { orderId: order.id, approvalUrl: approval });
}

async function captureOrder(request, response, orderId) {
  requirePayPal();
  const pending = sessions.get(orderId);
  if (!pending || Date.now() - pending.createdAt > 15 * 60 * 1000) return json(response, 400, { error: "注文の有効期限が切れています" });
  const result = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: { "PayPal-Request-Id": randomBytes(16).toString("hex") }
  });
  if (result.status !== "COMPLETED") return json(response, 402, { error: "決済が完了していません" });
  sessions.delete(orderId);
  return json(response, 200, { courseId: pending.courseId, status: "COMPLETED" });
}

function secureEqual(left, right) {
  const a = Buffer.from(left || "");
  const b = Buffer.from(right || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function verifyWebhook(request, response) {
  requirePayPal();
  if (!WEBHOOK_ID) return json(response, 503, { error: "PAYPAL_WEBHOOK_ID is not configured" });
  const body = await readBody(request);
  const headers = {
    "transmission-id": request.headers["paypal-transmission-id"],
    "transmission-time": request.headers["paypal-transmission-time"],
    "cert-url": request.headers["paypal-cert-url"],
    "auth-algo": request.headers["paypal-auth-algo"],
    "transmission-sig": request.headers["paypal-transmission-sig"],
    "webhook-id": WEBHOOK_ID,
    "webhook-event": JSON.parse(body)
  };
  const verified = await paypalRequest("/v1/notifications/verify-webhook-signature", { method: "POST", body: JSON.stringify(headers) });
  if (!secureEqual(verified.verification_status, "SUCCESS")) return json(response, 400, { error: "invalid webhook signature" });
  return json(response, 204, {});
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/api/paypal/orders") return await createOrder(request, response);
    if (request.method === "POST" && request.url?.startsWith("/api/paypal/orders/") && request.url.endsWith("/capture")) {
      return await captureOrder(request, response, request.url.split("/")[4]);
    }
    if (request.method === "POST" && request.url === "/api/paypal/webhook") return await verifyWebhook(request, response);
    if (request.method === "GET") {
      const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
      const file = pathname === "/" ? "index.html" : pathname.slice(1);
      if (!["index.html", "app.js", "styles.css"].includes(file)) return json(response, 404, { error: "not found" });
      const contentType = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" }[extname(file)];
      response.writeHead(200, { "content-type": contentType, "cache-control": "no-cache" });
      response.end(await readFile(file));
      return;
    }
    json(response, 404, { error: "not found" });
  } catch (error) {
    console.error(error);
    const status = error.message === "PayPal is not configured" ? 503 : 500;
    json(response, status, { error: status === 503 ? "PayPal決済が設定されていません" : "決済処理に失敗しました" });
  }
});

server.listen(PORT, () => console.log(`PayPal API listening on :${PORT}`));
