import * as Y from "yjs";
import * as sync from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import { Awareness } from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

export type ProviderStatus = "connecting" | "connected" | "disconnected" | "error";

export type ProviderOptions = {
  url: string;
  token: string;
  doc: Y.Doc;
  awareness?: Awareness;
  canWrite: boolean;
  resyncInterval?: number;
  maxBackoffTime?: number;
  onStatus?: (status: ProviderStatus) => void;
  onSynced?: () => void;
};

/**
 * Minimal Yjs WebSocket provider that speaks the standard sync protocol.
 * Auth is via first message (JWT), NOT URL query param.
 */
export class CollabWSProvider {
  public doc: Y.Doc;
  public awareness: Awareness;
  public canWrite: boolean;

  private ws: WebSocket | null = null;
  private status: ProviderStatus = "disconnected";
  private shouldConnect = true;
  private resyncInterval: number;
  private maxBackoffTime: number;
  private backoff = 1000;
  private resyncTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private updateHandler: (update: Uint8Array, origin: unknown) => void;
  private awarenessHandler: (event: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => void;
  private onStatus?: (status: ProviderStatus) => void;
  private onSynced?: () => void;
  private url: string;
  private token: string;
  private isSynced = false;
  private authed = false;

  constructor(opts: ProviderOptions) {
    this.url = opts.url;
    this.token = opts.token;
    this.doc = opts.doc;
    this.awareness = opts.awareness ?? new Awareness(opts.doc);
    this.canWrite = opts.canWrite;
    this.resyncInterval = opts.resyncInterval ?? 30000;
    this.maxBackoffTime = opts.maxBackoffTime ?? 30000;
    this.onStatus = opts.onStatus;
    this.onSynced = opts.onSynced;

    this.updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === this) return;
      if (!this.canWrite) return;
      if (!this.authed) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      sync.writeUpdate(encoder, update);
      this.ws.send(encoding.toUint8Array(encoder));
    };
    this.doc.on("update", this.updateHandler);

    this.awarenessHandler = (event: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
      if (origin === this) return;
      if (!this.authed) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const clients = [...event.added, ...event.updated, ...event.removed];
      if (clients.length === 0) return;
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(this.awareness, clients);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(encoder, awarenessUpdate);
      this.ws.send(encoding.toUint8Array(encoder));
    };
    this.awareness.on("update", this.awarenessHandler);
  }

  private setStatus(s: ProviderStatus) {
    if (this.status === s) return;
    this.status = s;
    this.onStatus?.(s);
  }

  connect() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    this.shouldConnect = true;
    this.setStatus("connecting");
    this.isSynced = false;
    this.authed = false;

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (e) {
      console.error("[ws-provider] failed to construct WebSocket:", e);
      this.scheduleReconnect();
      return;
    }
    ws.binaryType = "arraybuffer";
    this.ws = ws;

    ws.onopen = () => {
      this.backoff = 1000;
      ws.send(this.token);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "auth_ok") {
            this.authed = true;
            this.onAuthed();
          }
        } catch { /* ignore */ }
        return;
      }
      if (event.data instanceof Blob) {
        event.data.text().then((text) => {
          try {
            const msg = JSON.parse(text);
            if (msg.type === "auth_ok") {
              this.authed = true;
              this.onAuthed();
              return;
            }
          } catch { /* not JSON */ }
          event.data!.arrayBuffer().then((buf) => {
            this.handleMessage(new Uint8Array(buf));
          });
        });
        return;
      }
      let data: unknown;
      if (event.data instanceof ArrayBuffer) {
        data = new Uint8Array(event.data);
      } else if (event.data instanceof Uint8Array) {
        data = event.data;
      } else {
        return;
      }
      if (!(data instanceof Uint8Array)) return;
      this.handleMessage(data);
    };

    ws.onclose = () => {
      this.ws = null;
      this.authed = false;
      if (this.resyncTimer) { clearInterval(this.resyncTimer); this.resyncTimer = null; }
      this.setStatus("disconnected");
      if (this.shouldConnect) this.scheduleReconnect();
    };

    ws.onerror = () => { this.setStatus("error"); };
  }

  private onAuthed() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    sync.writeSyncStep1(encoder, this.doc);
    this.ws.send(encoding.toUint8Array(encoder));

    const awarenessStates = [...this.awareness.getStates().keys()];
    if (awarenessStates.length > 0) {
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, awarenessStates);
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, messageAwareness);
      encoding.writeVarUint8Array(enc, update);
      this.ws.send(encoding.toUint8Array(enc));
    }

    if (this.resyncTimer) clearInterval(this.resyncTimer);
    this.resyncTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, messageSync);
      sync.writeSyncStep1(enc, this.doc);
      this.ws.send(encoding.toUint8Array(enc));
    }, this.resyncInterval);
  }

  private handleMessage(data: Uint8Array) {
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);
    const encoder = encoding.createEncoder();

    switch (messageType) {
      case messageSync: {
        encoding.writeVarUint(encoder, messageSync);
        sync.readSyncMessage(decoder, encoder, this.doc, this);
        if (encoding.length(encoder) > 0) {
          this.ws?.send(encoding.toUint8Array(encoder));
        }
        if (!this.isSynced) {
          this.isSynced = true;
          this.setStatus("connected");
          this.onSynced?.();
        }
        break;
      }
      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(this.awareness, decoding.readVarUint8Array(decoder), this);
        break;
      }
      case messageQueryAwareness: {
        const states = [...this.awareness.getStates().keys()];
        const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, states);
        const enc = encoding.createEncoder();
        encoding.writeVarUint(enc, messageAwareness);
        encoding.writeVarUint8Array(enc, update);
        this.ws?.send(encoding.toUint8Array(enc));
        break;
      }
      default: break;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 1.7, this.maxBackoffTime);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.resyncTimer) { clearInterval(this.resyncTimer); this.resyncTimer = null; }
    if (this.ws) {
      this.ws.onclose = null; this.ws.onopen = null;
      this.ws.onmessage = null; this.ws.onerror = null;
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  reconnect() {
    this.disconnect();
    this.shouldConnect = true;
    this.backoff = 1000;
    this.connect();
  }

  destroy() {
    this.doc.off("update", this.updateHandler);
    this.awareness.off("update", this.awarenessHandler);
    this.disconnect();
  }

  getStatus(): ProviderStatus {
    return this.status;
  }
}
