/**
 * Single Socket.IO client instance for the entire application.
 *
 * - `autoConnect: false` — connection opened explicitly via connectSocket()
 * - Auth callback reads `jt_token` from localStorage at connect time
 */

import { io, type Socket } from "socket.io-client";
import { appConfig } from "@/config";

const socket: Socket = io(appConfig.socketUrl, {
  autoConnect: false,
  transports: ["websocket"],
  auth: (cb) => {
    const token =
      typeof window !== "undefined"
        ? (localStorage.getItem("jt_token") ?? "")
        : "";
    cb({ token });
  },
});

export default socket;
