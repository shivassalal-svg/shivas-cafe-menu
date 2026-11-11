"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data?.error || "Invalid PIN");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1.25rem", width: "100%" }}>
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Enter PIN (default: shiva123)"
        aria-label="Admin PIN"
        required
        style={{
          width: "100%",
          padding: "11px 14px",
          border: "1px solid var(--line)",
          background: "#fffefa",
          borderRadius: "10px",
          marginBottom: "12px",
          fontSize: "13px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <div style={{ color: "#a74736", fontSize: "12px", marginBottom: "12px", fontWeight: "600" }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        className="solid-button"
        style={{ width: "100%", marginBottom: "12px", cursor: "pointer" }}
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign in to manage menu"}
      </button>
    </form>
  );
}
