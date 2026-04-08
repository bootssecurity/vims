"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

async function signIn(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Invalid credentials");
  }
  return res.json();
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await signIn(email, password);
        router.push(from);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Subtle background grid */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          margin: "1rem",
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "2.5rem",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Logo mark */}
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "48px",
              height: "48px",
              borderRadius: "calc(var(--radius) - 4px)",
              background: "var(--primary)",
              marginBottom: "1rem",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: "var(--primary-foreground)" }}
            >
              <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.6" />
              <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--foreground)",
              letterSpacing: "-0.02em",
            }}
          >
            VIMS Platform
          </h1>
          <p
            style={{
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
              color: "var(--muted-foreground)",
            }}
          >
            Sign in to your workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label
              htmlFor="email"
              style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vims.dev"
              style={{
                padding: "0.625rem 0.875rem",
                background: "var(--input)",
                border: "1px solid var(--border)",
                borderRadius: "calc(var(--radius) - 4px)",
                color: "var(--foreground)",
                fontSize: "0.875rem",
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                fontFamily: "var(--font-sans)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ring)";
                e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--ring) 20%, transparent)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label
                htmlFor="password"
                style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--foreground)" }}
              >
                Password
              </label>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                padding: "0.625rem 0.875rem",
                background: "var(--input)",
                border: "1px solid var(--border)",
                borderRadius: "calc(var(--radius) - 4px)",
                color: "var(--foreground)",
                fontSize: "0.875rem",
                outline: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
                fontFamily: "var(--font-sans)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ring)";
                e.target.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--ring) 20%, transparent)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: "0.75rem 1rem",
                background: "color-mix(in srgb, var(--destructive) 10%, transparent)",
                border: "1px solid var(--destructive)",
                borderRadius: "calc(var(--radius) - 4px)",
                color: "var(--destructive)",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem 1rem",
              background: isPending
                ? "var(--muted)"
                : "var(--primary)",
              color: isPending
                ? "var(--muted-foreground)"
                : "var(--primary-foreground)",
              border: "none",
              borderRadius: "calc(var(--radius) - 4px)",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
              fontFamily: "var(--font-sans)",
              letterSpacing: "-0.01em",
            }}
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--muted-foreground)",
          }}
        >
          VIMS Platform v0.1.0 · Secure Admin Access
        </p>
      </div>
    </main>
  );
}
