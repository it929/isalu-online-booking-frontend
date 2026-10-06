import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../api/client";

/**
 * Live hospital feed over WebSocket (/ws/notifications/).
 *
 * - Connects to the API server (not the frontend host) using the staff JWT
 *   that the dashboard stores in sessionStorage.
 * - Calls onUpdate for every booking event the backend broadcasts.
 * - Reconnects with backoff; stops if the server rejects the token (4401).
 * - Returns { connected } so the UI can show whether updates are live.
 */
export const useHospitalLiveFeed = (
    onUpdate: (message: any) => void,
    enabled: boolean = true
) => {
    const [connected, setConnected] = useState(false);
    const callbackRef = useRef(onUpdate);
    callbackRef.current = onUpdate;

    useEffect(() => {
        if (!enabled || typeof window === "undefined" || typeof WebSocket === "undefined") return;

        let socket: WebSocket | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;
        let pingTimer: ReturnType<typeof setInterval> | undefined;
        let attempts = 0;
        let stopped = false;

        const buildUrl = () => {
            const token =
                sessionStorage.getItem("isalu_staff_jwt") ||
                localStorage.getItem("access") ||
                "";
            if (!token) return null;
            const base = new URL(API_BASE_URL, window.location.origin);
            const protocol = base.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${base.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
        };

        const connect = () => {
            const url = buildUrl();
            if (!url || stopped) return;
            try {
                socket = new WebSocket(url);
            } catch {
                scheduleRetry();
                return;
            }
            socket.onopen = () => {
                attempts = 0;
                setConnected(true);
                pingTimer = setInterval(() => {
                    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "ping" }));
                }, 25000);
            };
            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message?.type === "pong") return;
                    callbackRef.current(message);
                } catch {
                    /* ignore malformed frames */
                }
            };
            socket.onclose = (event) => {
                setConnected(false);
                if (pingTimer) clearInterval(pingTimer);
                if (stopped || event.code === 4401) return; // rejected token: polling keeps data fresh
                scheduleRetry();
            };
            socket.onerror = () => socket?.close();
        };

        const scheduleRetry = () => {
            attempts += 1;
            retryTimer = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts, 5)));
        };

        connect();
        return () => {
            stopped = true;
            if (retryTimer) clearTimeout(retryTimer);
            if (pingTimer) clearInterval(pingTimer);
            socket?.close();
            setConnected(false);
        };
    }, [enabled]);

    return { connected };
};
