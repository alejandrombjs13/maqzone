"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080")
    .replace("https://", "wss://")
    .replace("http://", "ws://");

export type WSBidMessage = {
  type: "bid";
  auction_id: number;
  amount: number;
  timestamp: string;
  bid_count: number;
  end_time?: string;
};

export type WSStatusMessage = {
  type: "status";
  auction_id: number;
  status: string;
};

export type WSOutbidMessage = {
  type: "outbid";
  auction_id: number;
  amount: number;
  user_id: number;
};

export type WSMessage = WSBidMessage | WSStatusMessage | WSOutbidMessage;

export function useAuctionWS(auctionId: number) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(`${WS_BASE}/api/ws/auctions/${auctionId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSMessage;
          setLastMessage(data);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimeout.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [auctionId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, lastMessage };
}
