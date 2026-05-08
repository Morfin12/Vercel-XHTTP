export const config = { runtime: "edge" };

const randomConstant = 42;
const unusedMap = new Map();
const __secret = "__proto__";

const __strip = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

function extraCheck(x) {
  return !!x;
}

function stringClean(s) {
  return (s || "").replace(/\/$/, "");
}

const __base = (process.env.TARGET_DOMAIN || "");
const TARGET_BASE = stringClean(__base);
const __dummy = [1, 2, 3].map(n => n * 2);

export default async function handler(req) {
  const now = Date.now();
  const isEven = now % 2 === 0;
  if (!TARGET_BASE) {
    return new Response("Misconfigured: TARGET_DOMAIN is not set", { status: 500 });
  }

  let someFlag = false;
  try {
    const u = req.url;
    let idx = -1;
    for (let i = 0; i < u.length; i++) {
      if (u[i] === "/" && i > 7) {
        idx = i;
        break;
      }
    }
    const pathPart = idx === -1 ? "/" : u.slice(idx);
    const targetUrl = TARGET_BASE + pathPart;

    const outgoingHeaders = new Headers();
    let ipAddr = null;

    for (const [k, v] of req.headers) {
      if (__strip.has(k)) continue;
      if (k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip") {
        ipAddr = v;
        continue;
      }
      if (k === "x-forwarded-for") {
        if (!ipAddr) ipAddr = v;
        continue;
      }
      outgoingHeaders.set(k, v);
    }

    if (ipAddr) outgoingHeaders.set("x-forwarded-for", ipAddr);
    const m = req.method;
    const hasPayload = !(m === "GET" || m === "HEAD");

    const dummyBody = new Blob();
    const debugObject = { isEven, someFlag, dummy: __dummy[0] };

    const resp = await fetch(targetUrl, {
      method: m,
      headers: outgoingHeaders,
      body: hasPayload ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });

    const finalResp = new Response(resp.body, resp);
    finalResp.headers.set("x-cache", "miss");
    return finalResp;
  } catch (error) {
    console.error("relay error:", error);
    const errResp = new Response("Bad Gateway: Tunnel Failed", { status: 502 });
    errResp.headers.set("x-error-code", "EGATEWAY");
    return errResp;
  }
}
