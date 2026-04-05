"use client";

/**
 * HomeScreen — landing view displayed before the player joins a room.
 *
 * Two-column layout:
 *  - Public: Matchmake, Create Public Lobby (configurable size), Browse Lobbies table
 *  - Private: Create Private Room (configurable size), Join by 6-digit passkey
 *
 * All socket emissions go through socketEmitter; no direct socket access here.
 */

import { useState, useRef } from "react";
import Button from "@/components/ui/Button";
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
import { logout } from "@/utils/authApi";

const PLAYER_OPTIONS = [5, 6, 7, 8, 9, 10];

export default function HomeScreen() {
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [pubMax, setPubMax] = useState(5);
  const [privMax, setPrivMax] = useState(5);
  const [privCode, setPrivCode] = useState("");
  const [showLobbies, setShowLobbies] = useState(false);

  const lobbies = useGameStore((s) => s.lobbies);
  const authUser = useGameStore((s) => s.authUser);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  const lock = () => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setTimeout(() => {
      pendingRef.current = false;
      setPending(false);
    }, 5000);
    return true;
  };

  const handleMatchmake = () => {
    if (!lock()) return;
    emitPlayNow();
  };

  const handleCreatePublic = () => {
    if (!lock()) return;
    emitCreatePublicLobby(pubMax);
  };

  const handleBrowseLobbies = () => {
    setShowLobbies(true);
    emitGetLobbies();
  };

  const handleRefresh = () => {
    emitGetLobbies();
  };

  const handleJoinPublic = (roomId: string) => {
    if (!lock()) return;
    emitJoinPublicLobby(roomId);
  };

  const handleCreatePrivate = () => {
    if (!lock()) return;
    emitCreatePrivateRoom(privMax);
  };

  const handleJoinPrivate = () => {
    if (privCode.length !== 6) return;
    if (!lock()) return;
    emitJoinPrivateRoom(privCode);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {t("home.title")}
        </h1>
        <p className="text-base text-muted leading-relaxed max-w-sm">
          {t("home.subtitle")}
        </p>
      </div>

      {/* User info bar */}
      {authUser && (
        <div className="flex items-center justify-between w-full max-w-2xl mb-2 px-1">
          <span className="text-sm text-muted">
            <span className="text-foreground font-medium">{authUser.username}</span>
            {" · "}
            <span>{authUser.coins} coins</span>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            {t("auth.logout")}
          </button>
        </div>
      )}

      {/* Two-column card layout */}
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">

        {/* ── Public column ─────────────────────────────────────── */}
        <section className="flex flex-col gap-4 flex-1 bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-foreground">
            {t("home.public_section")}
          </h2>

          {/* Matchmake */}
          <Button variant="primary" fullWidth onClick={handleMatchmake} disabled={pending}>
            {pending ? t("common.loading") : t("home.matchmake")}
          </Button>

          {/* Create Public Lobby */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("home.max_players_label")}
            </span>
            <div className="flex gap-1.5">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPubMax(n)}
                  className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition-colors ${
                    pubMax === n
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted border-border hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button variant="outline" fullWidth onClick={handleCreatePublic} disabled={pending}>
              {t("home.create_public_lobby")}
            </Button>
          </div>

          {/* Browse Lobbies */}
          <div className="flex flex-col gap-2">
            {!showLobbies ? (
              <Button variant="outline" fullWidth onClick={handleBrowseLobbies}>
                {t("home.browse_lobbies")}
              </Button>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted font-medium uppercase tracking-wide">
                    {t("home.browse_lobbies")}
                  </span>
                  <button
                    onClick={handleRefresh}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("home.refresh")}
                  </button>
                </div>

                {lobbies.length === 0 ? (
                  <p className="text-xs text-muted text-center py-3">
                    {t("home.no_lobbies")}
                  </p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-xs text-muted text-left border-b border-border">
                        <th className="pb-1 pr-2 font-medium">{t("home.lobby_col_room")}</th>
                        <th className="pb-1 pr-2 font-medium">{t("home.lobby_col_creator")}</th>
                        <th className="pb-1 pr-2 font-medium">{t("home.lobby_col_players")}</th>
                        <th className="pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {lobbies.map((lobby) => (
                        <tr key={lobby.roomId} className="border-b border-border last:border-0">
                          <td className="py-1.5 pr-2 font-mono text-foreground text-xs">
                            {lobby.roomId}
                          </td>
                          <td className="py-1.5 pr-2 text-foreground">{lobby.creatorName}</td>
                          <td className="py-1.5 pr-2 text-foreground">
                            {lobby.playerCount}/{lobby.maxPlayers}
                          </td>
                          <td className="py-1.5">
                            <button
                              onClick={() => handleJoinPublic(lobby.roomId)}
                              disabled={pending}
                              className="text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                            >
                              {t("home.join_lobby")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Private column ────────────────────────────────────── */}
        <section className="flex flex-col gap-4 flex-1 bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-foreground">
            {t("home.private_section")}
          </h2>

          {/* Create Private Room */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("home.max_players_label")}
            </span>
            <div className="flex gap-1.5">
              {PLAYER_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPrivMax(n)}
                  className={`flex-1 rounded-lg border py-1.5 text-sm font-semibold transition-colors ${
                    privMax === n
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-muted border-border hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button variant="primary" fullWidth onClick={handleCreatePrivate} disabled={pending}>
              {pending ? t("common.loading") : t("home.create_room")}
            </Button>
          </div>

          {/* Join Private Room */}
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wide">
              {t("home.join_private")}
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder={t("home.join_code_placeholder")}
                value={privCode}
                onChange={(e) => setPrivCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={pending}
                className="flex-1 rounded-xl border border-border bg-background text-foreground px-4 py-2 text-sm font-mono tracking-widest placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <Button
                variant="outline"
                onClick={handleJoinPrivate}
                disabled={pending || privCode.length !== 6}
              >
                {t("home.join")}
              </Button>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
