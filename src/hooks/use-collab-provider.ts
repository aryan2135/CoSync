"use client";

import * as React from "react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { CollabWSProvider, type ProviderStatus } from "@/lib/crdt/ws-provider";

export type CollabStatus = ProviderStatus;

export type CollabProvider = {
  doc: Y.Doc;
  awareness: Awareness;
  status: CollabStatus;
  refresh: () => void;
};

type Options = {
  documentId: string;
  tokenGetter: () => Promise<string | null>;
  role: "OWNER" | "EDITOR" | "VIEWER";
  onAuthError?: () => void;
};

export function useCollabProvider(opts: Options): CollabProvider {
  const { documentId, role } = opts;

  const tokenGetterRef = React.useRef(opts.tokenGetter);
  const onAuthErrorRef = React.useRef(opts.onAuthError);
  tokenGetterRef.current = opts.tokenGetter;
  onAuthErrorRef.current = opts.onAuthError;

  const [status, setStatus] = React.useState<CollabStatus>("connecting");

  const docRef = React.useRef<Y.Doc | null>(null);
  if (docRef.current === null) docRef.current = new Y.Doc();
  const doc = docRef.current;

  const awarenessRef = React.useRef<Awareness | null>(null);
  if (awarenessRef.current === null) awarenessRef.current = new Awareness(doc);
  const awareness = awarenessRef.current;

  const providerRef = React.useRef<CollabWSProvider | null>(null);
  const mountedRef = React.useRef(true);

  const buildWsUrl = React.useCallback((): string => {
    if (process.env.NEXT_PUBLIC_COLLAB_URL) {
      return process.env.NEXT_PUBLIC_COLLAB_URL;
    }
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${proto}//${hostname}:3001`;
    }
    const host = window.location.host;
    return `${proto}//${host}/?XTransformPort=3001`;
  }, []);

  const connect = React.useCallback(async () => {
    if (providerRef.current) return;
    const token = await tokenGetterRef.current();
    if (!token || !mountedRef.current) {
      onAuthErrorRef.current?.();
      setStatus("error");
      return;
    }
    const url = buildWsUrl();
    const provider = new CollabWSProvider({
      url, token,
      doc: docRef.current!,
      awareness: awarenessRef.current ?? undefined,
      canWrite: role !== "VIEWER",
      onStatus: (s) => { if (mountedRef.current) setStatus(s); },
    });
    provider.connect();
    providerRef.current = provider;
  }, [buildWsUrl, role]);

  const refresh = React.useCallback(() => {
    providerRef.current?.reconnect();
  }, []);

  React.useEffect(() => {
    let persistence: { destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { IndexeddbPersistence } = await import("y-indexeddb");
        if (cancelled || !docRef.current) return;
        persistence = new IndexeddbPersistence(`cosync-doc-${documentId}`, docRef.current);
      } catch (e) {
        console.error("[y-indexeddb] init failed:", e);
      }
    })();
    return () => { cancelled = true; persistence?.destroy(); };
  }, [documentId]);

  React.useEffect(() => {
    mountedRef.current = true;
    void connect();
    return () => {
      mountedRef.current = false;
      providerRef.current?.destroy();
      providerRef.current = null;
    };
  }, [connect]);

  React.useEffect(() => {
    const onOnline = () => {
      setStatus("connecting");
      if (!providerRef.current) void connect();
      else providerRef.current.reconnect();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [connect]);

  return { doc, awareness, status, refresh };
}
