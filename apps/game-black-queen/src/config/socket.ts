/**
 * Single Socket.IO client instance for the entire application.
 *
 * Rules:
 * - This is the ONLY place a socket is created.
 * - `autoConnect: false` — the connection is opened explicitly via
 *   `useGameStore.connectSocket()`, not on module import.
 * - Import this instance wherever you need direct socket access
 *   (e.g. emitting events from hooks or store actions).
 *
 * @module config/socket
 */

import { io, type Socket } from "socket.io-client";
import { appConfig } from "@/config";

/**
 * The singleton Socket.IO client.
 * Connected lazily; never re-instantiated.
 */
const socket: Socket = io(appConfig.socketUrl, {
  autoConnect: false,
  transports: ["websocket"],
  auth: (cb) => {
    const token =
      typeof window !== "undefined"
        ? (localStorage.getItem("bq_token") ?? "")
        : "";
    cb({ token });
  },
});

export default socket;
