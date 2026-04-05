"use client";

import { useSocket } from "@/hooks/useSocket";

interface Props {
  children: React.ReactNode;
}

export default function SocketInitializer({ children }: Props) {
  useSocket();
  return <>{children}</>;
}
