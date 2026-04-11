"use client";

import { useState, useRef, useEffect } from "react";
import { GameLobby } from "@cards/ui";
import { t } from "@/utils/i18n";
import {
  emitPlayNow,
  emitCreatePublicLobby,
  emitJoinPublicLobby,
  emitCreatePrivateRoom,
  emitJoinPrivateRoom,
  emitGetLobbies,
} from "@/utils/socketEmitter";
import { useGameStore } from "@/store/gameStore";

const MIN_PLAYERS = 5;
const MAX_PLAYERS = 10;

export default function HomeScreen() {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const lobbies = useGameStore((s) => s.lobbies);

  useEffect(() => {
    emitGetLobbies();
  }, []);

  const lock = () => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setTimeout(() => { pendingRef.current = false; setPending(false); }, 5000);
    return true;
  };

  return (
    <GameLobby
      minPlayers={MIN_PLAYERS}
      maxPlayers={MAX_PLAYERS}
      title={t("home.title")}
      subtitle={t("home.subtitle")}
      lobbies={lobbies}
      pending={pending}
      matchmakeLabel={t("home.matchmake")}
      createPublicLabel={t("home.create_public_lobby")}
      createPrivateLabel={t("home.create_room")}
      loadingLabel={t("common.loading")}
      refreshLabel={t("home.refresh")}
      onMatchmake={() => { if (!lock()) return; emitPlayNow(); }}
      onCreatePublicLobby={(max) => { if (!lock()) return; emitCreatePublicLobby(max); }}
      onCreatePrivateRoom={(max) => { if (!lock()) return; emitCreatePrivateRoom(max); }}
      onJoinPublicLobby={(roomId) => { if (!lock()) return; emitJoinPublicLobby(roomId); }}
      onJoinPrivateRoom={(passkey) => { if (!lock()) return; emitJoinPrivateRoom(passkey); }}
      onRefresh={emitGetLobbies}
    />
  );
}
