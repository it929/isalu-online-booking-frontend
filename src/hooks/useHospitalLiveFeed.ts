// In frontend/src/hooks/useHospitalLiveFeed.ts
import { useEffect } from "react";

interface LiveUpdatePayload {
    type: string;
    data: {
        event_type: string;
        ref_code?: string;
        status?: string;
        message?: string;
        [key: string]: unknown;
    };
}

export const useHospitalLiveFeed = (onUpdateReceived: () => void) => {
    useEffect(() => {
        const token = localStorage.getItem("access") || localStorage.getItem("token");
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname === "localhost" ? "127.0.0.1:8000" : window.location.host;
        const wsUrl = `${protocol}//${host}/ws/notifications/${token ? `?token=${token}` : ""}`;

        let socket: WebSocket | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout>;

        const connect = () => {
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("[WebSocket] Connected to hospital live feed");
            };

            socket.onmessage = (event) => {
                try {
                    const message: LiveUpdatePayload = JSON.parse(event.data);
                    if (message.type === "BOOKING_UPDATE") {
                        onUpdateReceived();
                    }
                } catch (err) {
                    console.error("[WebSocket] Parse error:", err);
                }
            };

            socket.onclose = () => {
                reconnectTimeout = setTimeout(connect, 3000);
            };

            socket.onerror = (err) => {
                console.error("[WebSocket] Error:", err);
                socket?.close();
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimeout);
            if (socket) socket.close();
        };
    }, [onUpdateReceived]);
};