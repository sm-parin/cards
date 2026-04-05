"use client";

import { useState, useEffect } from "react";
import AppView from "@/components/AppView";
import AuthScreen from "@/components/auth/AuthScreen";
import { getToken } from "@/utils/socketEmitter";
import { logout } from "@/utils/authApi";
import { decodeToken, isTokenExpired } from "@/utils/tokenUtils";
import { useGameStore } from "@/store/gameStore";
import type { PlatformUser } from "@cards/types";

export default function Page() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const setAuthUser = useGameStore((s) => s.setAuthUser);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthed(false);
      return;
    }
    if (isTokenExpired()) {
      logout();
      setAuthed(false);
      return;
    }
    const payload = decodeToken();
    if (payload) {
      setAuthUser({
        id: payload.userId,
        username: payload.username,
        coins: 0, // populated from server on ROOM_JOINED / REJOIN_SUCCESS
      });
    }
    setAuthed(true);
  }, [setAuthUser]);

  if (authed === null) return null;

  if (!authed) {
    return (
      <AuthScreen
        onSuccess={(user: PlatformUser) => {
          setAuthUser(user);
          // Reload so the socket re-initialises with the freshly stored token.
          window.location.reload();
        }}
      />
    );
  }

  return <AppView />;
}
