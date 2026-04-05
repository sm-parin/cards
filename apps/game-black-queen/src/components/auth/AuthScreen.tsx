"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { t } from "@/utils/i18n";
import { register, login } from "@/utils/authApi";
import type { PlatformUser } from "@cards/types";

interface AuthScreenProps {
  onSuccess: (user: PlatformUser) => void;
}

type Tab = "login" | "register";

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background text-foreground px-4 py-2.5 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary";

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (username.trim().length < 2) {
      setError(t("auth.error.username_short"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.error.password_short"));
      return;
    }
    if (tab === "register" && password !== confirm) {
      setError(t("auth.error.passwords_no_match"));
      return;
    }

    setLoading(true);
    try {
      const result =
        tab === "register"
          ? await register(username.trim(), password)
          : await login(username.trim(), password);

      onSuccess(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Black Queen
          </h1>
          <p className="mt-1 text-sm text-muted">Real-time multiplayer card game</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-6">
          {/* Tabs */}
          <div className="mb-6 flex rounded-xl border border-border overflow-hidden">
            {(["login", "register"] as Tab[]).map((t_) => (
              <button
                key={t_}
                type="button"
                onClick={() => switchTab(t_)}
                className={[
                  "flex-1 py-2 text-sm font-semibold transition-colors",
                  tab === t_
                    ? "bg-primary text-white"
                    : "bg-background text-muted hover:text-foreground",
                ].join(" ")}
              >
                {t_ === "login" ? t("auth.login") : t("auth.register")}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide">
                {t("auth.username")}
              </label>
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth.username")}
                disabled={loading}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted uppercase tracking-wide">
                {t("auth.password")}
              </label>
              <input
                type="password"
                autoComplete={tab === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
                disabled={loading}
                className={INPUT_CLASS}
              />
            </div>

            {tab === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wide">
                  {t("auth.confirm_password")}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("auth.confirm_password")}
                  disabled={loading}
                  className={INPUT_CLASS}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button variant="primary" fullWidth disabled={loading}>
              {loading ? t("auth.loading") : t("auth.submit")}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
