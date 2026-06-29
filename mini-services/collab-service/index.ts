/**
 * CoSync Collaboration Service
 * A Yjs CRDT sync server over raw WebSocket (binary protocol).
 */

import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "node:http";
import { createHmac } from "node:crypto";
import { URL } from "node:url";
import * as Y from "yjs";
import * as sync from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { Awareness } from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Auto-load parent .env file if running in standalone Node environment
if (!process.env.COLLAB_JWT_SECRET) {
  const envPaths = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env"), resolve(process.cwd(), "../.env")];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) process.env[key] = val;
          }
        }
      } catch {}
      break;
    }
  }
}

const PORT = 3001;
const JWT_SECRET = process.env.COLLAB_JWT_SECRET || "dev-collab-secret-change-me";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || "dev-internal-secret-change-me";
const APP_BASE = process.env.APP_BASE || "http://localhost:3000";

const MAX_UPDATE_BYTES = 1 * 1024 * 1024;
const MAX_OPS_PER_SECOND = 30;
const PERSIST_INTERVAL_MS = 15_000;
const IDLE_EVICT_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL = 30_000;
const HEARTBEAT_TIMEOUT = 10_000;

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

type JwtPayload = {
  userId: string;
  documentId: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  exp?: number;
};

function base64UrlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from((s + pad).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function verifyToken(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac("sha256", JWT_SECRET).update(signingInput).digest("base64url");
  if (expectedSig !== sigB64) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as JwtPayload;
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;
    return payload;
  } catch { return null; }
}

async function persistDoc(documentId: string, doc: Y.Doc) {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    const stateVector = Buffer.from(Y.encodeStateVector(doc));
    const fragment = doc.getXmlFragment("default");
    const text = fragment.toString().replace(/<[^>]+>/g, " ").trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const preview = text.slice(0, 500);
    await fetch(`${APP_BASE}/api/internal/persist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_SECRET },
      body: JSON.stringify({ documentId, state: state.toString("base64"), stateVector: stateVector.toString("base64"), preview, wordCount }),
    });
  } catch (err) { console.error(`[persist] ${documentId} failed:`, err); }
}

async function loadDocState(documentId: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(`${APP_BASE}/api/internal/state?documentId=${documentId}`, { headers: { "x-internal-secret": INTERNAL_SECRET } });
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: string | null };
    if (!data.state) return null;
    return Buffer.from(data.state, "base64");
  } catch { return null; }
}

type DocEntry = {
  doc: Y.Doc;
  awareness: Awareness;
  conns: Map<WebSocket, { userId: string; role: string }>;
  lastActivity: number;
  persistTimer: NodeJS.Timeout | null;
  dirty: boolean;
};

const docs = new Map<string, DocEntry>();
const loadingDocs = new Map<string, Promise<DocEntry>>();

function schedulePersist(id: string) {
  const entry = docs.get(id);
  if (!entry || entry.persistTimer) return;
  entry.persistTimer = setTimeout(async () => {
    const e = docs.get(id);
    if (!e) return;
    e.persistTimer = null;
    if (e.dirty) { await persistDoc(id, e.doc); e.dirty = false; }
  }, PERSIST_INTERVAL_MS);
}

async function ensureDoc(documentId: string): Promise<DocEntry> {
  const existing = docs.get(documentId);
  if (existing) return existing;
  let loading = loadingDocs.get(documentId);
  if (!loading) {
    loading = (async () => {
      let doc = new Y.Doc();
      const persisted = await loadDocState(documentId);
      if (persisted && persisted.length > 0) {
        try { Y.applyUpdate(doc, persisted); } catch (err) {
          console.error(`[ensureDoc] corrupted state for ${documentId}, starting fresh:`, err);
          doc = new Y.Doc();
        }
      }
      const entry: DocEntry = {
        doc, awareness: new Awareness(doc), conns: new Map(),
        lastActivity: Date.now(), persistTimer: null, dirty: false,
      };
      docs.set(documentId, entry);
      loadingDocs.delete(documentId);
      return entry;
    })();
    loadingDocs.set(documentId, loading);
  }
  return loading;
}

function closeDoc(id: string) {
  const entry = docs.get(id);
  if (!entry) return;
  if (entry.persistTimer) clearTimeout(entry.persistTimer);
  if (entry.dirty) void persistDoc(id, entry.doc);
  docs.delete(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of docs) {
    if (entry.conns.size === 0 && now - entry.lastActivity > IDLE_EVICT_MS) closeDoc(id);
  }
}, 60_000);

function send(ws: WebSocket, message: Uint8Array) {
  if (ws.readyState === WebSocket.OPEN) ws.send(message, (err) => { if (err) console.error("[ws] send error:", err.message); });
}

function broadcast(entry: DocEntry, data: Uint8Array, except: WebSocket | null) {
  for (const [conn] of entry.conns) {
    if (conn === except) continue;
    if (conn.readyState === WebSocket.OPEN) conn.send(data);
  }
}

const buckets = new WeakMap<WebSocket, { count: number; windowStart: number }>();
function rateLimitOk(ws: WebSocket): boolean {
  const now = Date.now();
  let b = buckets.get(ws);
  if (!b) { b = { count: 0, windowStart: now }; buckets.set(ws, b); }
  if (now - b.windowStart > 1000) { b.count = 0; b.windowStart = now; }
  b.count++;
  return b.count <= MAX_OPS_PER_SECOND;
}

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, docs: docs.size, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server: httpServer, path: "/" });

// Heartbeat
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState !== WebSocket.OPEN) continue;
    const ext = ws as WebSocket & { isAlive?: boolean };
    if (ext.isAlive === false) { ws.terminate(); continue; }
    ext.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL);

wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
  const ext = ws as WebSocket & { isAlive?: boolean };
  ext.isAlive = true;
  ws.on("pong", () => { ext.isAlive = true; });

  let authed = false;
  let payload: JwtPayload | null = null;
  const authTimeout = setTimeout(() => { if (!authed) ws.close(4002, "auth_timeout"); }, 10_000);

  ws.on("message", (data: Buffer, isBinary: boolean) => {
    if (!authed) {
      if (isBinary) { ws.close(4001, "expected_auth_message"); return; }
      const token = data.toString("utf8").trim();
      payload = verifyToken(token);
      if (!payload) { ws.close(4001, "unauthorized"); return; }
      authed = true;
      clearTimeout(authTimeout);
      ws.send(JSON.stringify({ type: "auth_ok" }));
      void initConnection(ws, payload);
      return;
    }
    if (!isBinary) return;
    handleBinaryMessage(ws, payload!, data);
  });

  ws.on("close", () => { clearTimeout(authTimeout); cleanupConnection(ws, payload); });
  ws.on("error", (err: Error) => { console.error("[ws] error:", err.message); });
});

async function initConnection(ws: WebSocket, payload: JwtPayload) {
  const entry = await ensureDoc(payload.documentId);
  entry.conns.set(ws, { userId: payload.userId, role: payload.role });
  entry.lastActivity = Date.now();

  const step1Encoder = encoding.createEncoder();
  encoding.writeVarUint(step1Encoder, messageSync);
  sync.writeSyncStep1(step1Encoder, entry.doc);
  send(ws, encoding.toUint8Array(step1Encoder));

  const updateHandler = (update: Uint8Array, origin: unknown) => {
    entry.dirty = true;
    entry.lastActivity = Date.now();
    schedulePersist(payload.documentId);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageSync);
    sync.writeUpdate(enc, update);
    broadcast(entry, encoding.toUint8Array(enc), origin === ws ? ws : null);
  };
  entry.doc.on("update", updateHandler);
  (ws as WebSocket & { _updateHandler?: (update: Uint8Array, origin: unknown) => void })._updateHandler = updateHandler;
}

function handleBinaryMessage(ws: WebSocket, payload: JwtPayload, data: Buffer) {
  const entry = docs.get(payload.documentId);
  if (!entry) return;
  const canWrite = payload.role === "OWNER" || payload.role === "EDITOR";
  if (data.length > MAX_UPDATE_BYTES) { ws.close(4003, "payload_too_large"); return; }
  if (!rateLimitOk(ws)) return;
  const u8 = new Uint8Array(data);
  const decoder = decoding.createDecoder(u8);
  let messageType: number;
  try { messageType = decoding.readVarUint(decoder); } catch { return; }
  try {
    switch (messageType) {
      case messageSync: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        sync.readSyncMessage(decoder, encoder, entry.doc, canWrite ? ws : null);
        if (encoding.length(encoder) > 0) send(ws, encoding.toUint8Array(encoder));
        break;
      }
      case messageAwareness: {
        const awarenessUpdate = decoding.readVarUint8Array(decoder);
        awarenessProtocol.applyAwarenessUpdate(entry.awareness, awarenessUpdate, ws);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageAwareness);
        encoding.writeVarUint8Array(enc, awarenessUpdate);
        broadcast(entry, encoding.toUint8Array(enc), ws);
        break;
      }
      case messageQueryAwareness: {
        const states = [...entry.awareness.getStates().keys()];
        const update = awarenessProtocol.encodeAwarenessUpdate(entry.awareness, states);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageAwareness);
        encoding.writeVarUint8Array(enc, update);
        send(ws, encoding.toUint8Array(enc));
        break;
      }
      default: break;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(`[msg] handler error type=${messageType} from ${payload.userId}: ${errMsg}`);
  }
}

function cleanupConnection(ws: WebSocket, payload: JwtPayload | null) {
  if (!payload) return;
  const entry = docs.get(payload.documentId);
  if (!entry) return;
  entry.conns.delete(ws);
  const uh = (ws as WebSocket & { _updateHandler?: (update: Uint8Array, origin: unknown) => void })._updateHandler;
  if (uh) entry.doc.off("update", uh);
  if (entry.conns.size > 0) {
    const states = [...entry.awareness.getStates().keys()];
    const update = awarenessProtocol.encodeAwarenessUpdate(entry.awareness, states);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, messageAwareness);
    encoding.writeVarUint8Array(enc, update);
    broadcast(entry, encoding.toUint8Array(enc), ws);
  }
  if (entry.conns.size === 0 && entry.dirty) {
    void persistDoc(payload.documentId, entry.doc).then(() => { entry.dirty = false; });
  }
}

httpServer.listen(PORT, () => { console.log(`✓ CoSync collab service on ws://localhost:${PORT} (path /)`); });

const shutdown = async (sig: string) => {
  console.log(`\n[${sig}] flushing ${docs.size} doc(s)…`);
  for (const [id, entry] of docs) { if (entry.dirty) await persistDoc(id, entry.doc); }
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
