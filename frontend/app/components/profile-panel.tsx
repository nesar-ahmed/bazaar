"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import type { UserProfile } from "@/lib/auth";

type ProfilePanelProps = {
  user: UserProfile;
};

export default function ProfilePanel({ user }: ProfilePanelProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.full_name);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName }),
      });
      const body = (await response.json()) as UserProfile | { error?: string };
      if (!response.ok || !("full_name" in body)) {
        setError("error" in body ? body.error ?? "We could not save your profile." : "We could not save your profile.");
        return;
      }
      setFullName(body.full_name);
      setMessage("Your profile has been updated.");
    } catch {
      setError("We could not reach Bazaar. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    setError("");
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("We could not sign you out. Please try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("We could not reach Bazaar. Please try signing out again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="account-layout">
      <aside className="account-sidebar">
        <p className="eyebrow">YOUR BAZAAR</p>
        <h2>Account</h2>
        <span className="account-nav-item" aria-current="page">Profile details</span>
        <span className="account-nav-muted">Orders · coming soon</span>
      </aside>
      <section className="account-card">
        <div className="account-card-heading">
          <div>
            <p className="eyebrow">PERSONAL INFORMATION</p>
            <h1>Your profile</h1>
          </div>
          <div className="avatar" aria-hidden="true">
            {user.full_name.slice(0, 1).toUpperCase()}
          </div>
        </div>
        <form className="auth-form profile-form" onSubmit={updateProfile}>
          <label>
            Full name
            <input
              autoComplete="name"
              maxLength={120}
              minLength={2}
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>
          <label>
            Email address
            <input autoComplete="email" disabled value={user.email} />
          </label>
          {message && <p className="form-success" role="status">{message}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="profile-actions">
            <button className="button button-dark" disabled={isSaving} type="submit">
              {isSaving ? "Saving…" : "Save changes"}
            </button>
            <button
              className="text-button"
              disabled={isSigningOut}
              onClick={signOut}
              type="button"
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
