"use client";

import { useEffect, useRef, useState } from "react";

export function useSocket() {
  const socketRef = useRef<any | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await fetch("/api/socket"); // ensure server is initialized
        const { io } = await import("socket.io-client");
        const s = io({ path: "/api/socket" });
        socketRef.current = s;
        s.on("connect", () => active && setConnected(true));
        s.on("disconnect", () => active && setConnected(false));
      } catch (e) {
        console.warn("Socket init error", e);
      }
    })();
    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { socket: socketRef.current, connected };
}


