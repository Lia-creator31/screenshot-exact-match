import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import type { GuestRecord } from "./lib/guests";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// In-memory store + optional local file persistence (.data/guests.json) when running in Node
let memoryGuests: GuestRecord[] | null = null;
const DB_FILE_PATH = ".data/guests.json";

async function loadServerGuests(): Promise<GuestRecord[]> {
  if (memoryGuests !== null) return memoryGuests;
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(DB_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryGuests = parsed;
      return memoryGuests;
    }
  } catch {
    // File doesn't exist yet or running in edge environment without node:fs
  }
  memoryGuests = [];
  return memoryGuests;
}

async function persistServerGuests(guests: GuestRecord[]): Promise<void> {
  memoryGuests = guests;
  try {
    const fs = await import("node:fs/promises");
    await fs.mkdir(".data", { recursive: true });
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(guests, null, 2), "utf8");
  } catch {
    // Ignore write errors in serverless/edge environments
  }
}

async function handleGuestsApi(request: Request): Promise<Response> {
  const headers = { "content-type": "application/json; charset=utf-8" };
  try {
    const current = await loadServerGuests();

    if (request.method === "GET") {
      return new Response(JSON.stringify({ guests: current }), { status: 200, headers });
    }

    if (request.method === "POST") {
      const body = (await request.json()) as { guests?: GuestRecord[]; mode?: "replace" | "merge" };
      const incoming = Array.isArray(body.guests) ? body.guests : [];
      if (body.mode === "replace") {
        await persistServerGuests(incoming);
        return new Response(JSON.stringify({ guests: incoming }), { status: 200, headers });
      }
      const map = new Map<string, GuestRecord>();
      for (const g of current) map.set(g.id, { ...g });
      for (const g of incoming) {
        const prev = map.get(g.id);
        map.set(g.id, prev ? { ...prev, ...g, waSentAt: prev.waSentAt || g.waSentAt, checkedInAt: prev.checkedInAt || g.checkedInAt } : g);
      }
      const merged = Array.from(map.values());
      await persistServerGuests(merged);
      return new Response(JSON.stringify({ guests: merged }), { status: 200, headers });
    }

    if (request.method === "PATCH") {
      const body = (await request.json()) as { id?: string; patch?: Partial<GuestRecord> };
      if (!body.id || !body.patch) {
        return new Response(JSON.stringify({ error: "Missing id or patch" }), { status: 400, headers });
      }
      const next = current.map((g) => (g.id === body.id ? { ...g, ...body.patch } : g));
      await persistServerGuests(next);
      return new Response(JSON.stringify({ guests: next }), { status: 200, headers });
    }

    if (request.method === "DELETE") {
      const body = (await request.json()) as { id?: string };
      const next = body.id ? current.filter((g) => g.id !== body.id) : [];
      await persistServerGuests(next);
      return new Response(JSON.stringify({ guests: next }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers });
  }
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/guests") {
        return await handleGuestsApi(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
