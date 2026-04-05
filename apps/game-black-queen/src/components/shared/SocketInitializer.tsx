"use client";

/**
 * SocketInitializer — mounts the useSocket hook at the application root.
 *
 * This component exists solely to call useSocket() once in the component tree,
 * above all pages. It renders its children without wrapping markup.
 *
 * Usage: wrap the body content in layout.tsx with this component.
 */

import { useSocket } from "@/hooks/useSocket";

interface Props {
  children: React.ReactNode;
}

export default function SocketInitializer({ children }: Props) {
  useSocket();
  return <>{children}</>;
}
