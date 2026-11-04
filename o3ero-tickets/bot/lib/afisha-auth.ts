import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WIDGET_KEY, MAPI_BASE, type AfishaResult, type Json } from "./afisha.js";

export const AFISHA_AUTH_KEY = "o3ero:afisha_auth";

/** Fallback file so CLI `bdk call` rounds can share a pending login. */
export function localAuthPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", ".local", "afisha-auth.json");
}

export async function loadLocalAuth(): Promise<AfishaAuthSession | undefined> {
  try {
    const raw = await readFile(localAuthPath(), "utf8");
    return JSON.parse(raw) as AfishaAuthSession;
  } catch {
    return undefined;
  }
}

export async function saveLocalAuth(session: AfishaAuthSession): Promise<void> {
  const path = localAuthPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(session, null, 2), "utf8");
}

export async function clearLocalAuth(): Promise<void> {
  try {
    await unlink(localAuthPath());
  } catch {
    /* missing ok */
  }
}

export type AfishaAuthSession = {
  userSessionId: string;
  clientId: string;
  state: string;
  nonce: string;
  redirectUrl: string;
  scope: string;
  loginUrl: string;
  expectedName: string;
  startedAt: string;
  status: "inProgress" | "success" | "error" | "mismatch";
  account?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  /** Present after success — sent as X-Sber-User-Session-Id */
  sberUserSessionId?: string;
};

async function mapi<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<AfishaResult<T>> {
  const res = await fetch(`${MAPI_BASE}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Application-key": WIDGET_KEY,
      "User-Agent": "o3ero-tickets-bot/0.1 (+https://o3ero.ru)",
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Json = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as Json;
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
  }
  if (res.status < 200 || res.status >= 300) {
    return { ok: false, status: res.status, error: parsed };
  }
  return { ok: true, status: res.status, data: parsed as T };
}

export function buildSberLoginUrl(auth: {
  clientId: string;
  state: string;
  nonce: string;
  redirectUrl: string;
  scope: string;
  loginHint?: string;
}): string {
  const params = new URLSearchParams({
    client_id: auth.clientId,
    client_type: "PRIVATE",
    response_type: "code",
    scope: auth.scope,
    state: auth.state,
    nonce: auth.nonce,
    redirect_uri: auth.redirectUrl,
    name: "Афиша",
  });
  if (auth.loginHint) params.set("login_hint", auth.loginHint);
  return `https://id.sber.ru/CSAFront/oidc/authorize.do?${params.toString()}`;
}

export async function startAfishaAuth(opts: {
  expectedName: string;
  widgetRedirectUrl?: string;
  loginHint?: string;
}): Promise<AfishaResult<AfishaAuthSession>> {
  const started = await mapi<{
    userSessionId: string;
    clientId: string;
    state: string;
    nonce: string;
    redirectUrl: string;
    scope: string;
  }>("POST", "/auth/redirect", {
    needAdditionalScope: true,
    widgetRedirectUrl: opts.widgetRedirectUrl ?? "https://o3ero.ru/",
  });
  if (!started.ok) return started;

  const loginUrl = buildSberLoginUrl({
    ...started.data,
    loginHint: opts.loginHint,
  });

  const session: AfishaAuthSession = {
    ...started.data,
    loginUrl,
    expectedName: opts.expectedName,
    startedAt: new Date().toISOString(),
    status: "inProgress",
    sberUserSessionId: started.data.userSessionId,
  };
  return { ok: true, status: 200, data: session };
}

export async function pollAfishaAuth(
  session: AfishaAuthSession,
): Promise<AfishaResult<AfishaAuthSession>> {
  const status = await mapi<{
    status: string;
    account?: { name?: string; email?: string; phone?: string };
  }>("GET", `/auth/${session.userSessionId}/status`, undefined, {
    "X-Sber-User-Session-Id": session.userSessionId,
  });
  if (!status.ok) return status;

  const next: AfishaAuthSession = {
    ...session,
    status:
      status.data.status === "success"
        ? "success"
        : status.data.status === "error"
          ? "error"
          : "inProgress",
    account: status.data.account,
    sberUserSessionId: session.userSessionId,
  };

  if (next.status === "success" && next.account?.name && next.expectedName) {
    const got = next.account.name.toLowerCase().replace(/\s+/g, " ").trim();
    const want = next.expectedName.toLowerCase().replace(/\s+/g, " ").trim();
    // allow "Кузьма Марчук" vs "Марчук Кузьма"
    const gotParts = new Set(got.split(" "));
    const wantParts = want.split(" ");
    const matched = wantParts.every((p) => gotParts.has(p));
    if (!matched) {
      next.status = "mismatch";
    }
  }

  if (next.status === "success") {
    // Confirm session via /auth/check
    await mapi("POST", "/auth/check", {}, {
      "X-Sber-User-Session-Id": next.userSessionId,
    });
  }

  return { ok: true, status: 200, data: next };
}

export async function listStoredCards(session: AfishaAuthSession): Promise<AfishaResult<Json>> {
  if (session.status !== "success" || !session.sberUserSessionId) {
    return { ok: false, status: 401, error: { message: "Afisha кабинет не подключён" } };
  }
  // Try both auth headers Afisha widgets use
  const withSber = await mapi<Json>("GET", "/account/storedpaymentcards", undefined, {
    "X-Sber-User-Session-Id": session.sberUserSessionId,
  });
  if (withSber.ok) return withSber;
  return mapi<Json>("GET", "/account/storedpaymentcards", undefined, {
    "X-Auth-Key": session.sberUserSessionId,
    "X-Sber-User-Session-Id": session.sberUserSessionId,
  });
}

export function authHeaders(session: AfishaAuthSession | undefined): Record<string, string> {
  if (!session || session.status !== "success" || !session.sberUserSessionId) return {};
  return {
    "X-Sber-User-Session-Id": session.sberUserSessionId,
  };
}
