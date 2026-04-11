"use client";

import { useGameStore } from "@/store/gameStore";
import { t } from "@/utils/i18n";
import { emitJtStartGame, emitLeaveRoom, emitUpdateMaxPlayers, emitPlayNow } from "@/utils/socketEmitter";
import { GameLobbyRoom } from "@cards/ui";

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export default function LobbyScreen() {
  const room = useGameStore((s) => s.room);
  const player = useGameStore((s) => s.player);
  const roomPasskey = useGameStore((s) => s.roomPasskey);
  const resetGame = useGameStore((s) => s.resetGame);
  const setMaxPlayers = useGameStore((s) => s.setMaxPlayers);

  if (!room) return null;

  const passkey = room.isPrivate ? (room.passkey ?? roomPasskey) : null;

  return (
    <GameLobbyRoom
      room={room}
      selfId={player?.id ?? null}
      passkey={passkey}
      playerOptions={PLAYER_OPTIONS}
      minPlayersToStart={2}
      titleLabel={t("lobby.waiting")}
      roomIdLabel={t("lobby.room_id")}
      passkeyLabel={t("lobby.passkey")}
      playersLabel={t("lobby.players")}
      maxPlayersLabel={t("lobby.max_players_label")}
      startGameLabel={t("lobby.start_game")}
      startGameHintLabel={t("lobby.start_game_hint")}
      matchAgainLabel={t("lobby.match_again")}
      leaveRoomLabel={t("lobby.leave_room")}
      onStart={() => emitJtStartGame({ roomId: room.roomId })}
      onLeave={() => { emitLeaveRoom(room.roomId); resetGame(); }}
      onMatchAgain={() => { const id = room.roomId; emitLeaveRoom(id); resetGame(); emitPlayNow(id); }}
      onChangeMaxPlayers={(n) => { setMaxPlayers(n); emitUpdateMaxPlayers(room.roomId, n); }}
    />
  );
}
