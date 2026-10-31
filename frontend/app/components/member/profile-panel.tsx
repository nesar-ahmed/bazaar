"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { AuthTextField } from "@/app/components/member/auth-fields";
import { signOutAndRedirect } from "@/app/components/member/session";
import { Button } from "@/app/components/ui/button";
import { Alert } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { apiSend } from "@/lib/client-api";
import { formatDate, orderRef } from "@/lib/format";
import type { UserProfile } from "@/lib/api-types";

const NAME_MIN = 2;
const NAME_MAX = 120;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || first.toUpperCase();
}

/** Profile tab: the only mutable field is the name, so say so where the rest lives. */
export function ProfilePanel({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [draft, setDraft] = useState(profile.full_name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const trimmed = draft.trim();
  const dirty = trimmed !== profile.full_name;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(null);

    if (trimmed.length === 0) {
      setError("Enter the name you want on your orders.");
      nameRef.current?.focus();
      return;
    }
    if (trimmed.length < NAME_MIN) {
      setError(`A name needs at least ${NAME_MIN} characters.`);
      nameRef.current?.focus();
      return;
    }
    if (trimmed.length > NAME_MAX) {
      setError(`A name is capped at ${NAME_MAX} characters. Trim ${trimmed.length - NAME_MAX} of them.`);
      nameRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      const updated = await apiSend<UserProfile>("users/me", { full_name: trimmed }, "PATCH");
      setDraft(updated.full_name);
      setSaved(`Saved as ${updated.full_name}.`);
      // The header block and every other read come from the server, so refresh.
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "We could not save your name. Nothing was lost, try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await signOutAndRedirect(router);
    } catch {
      setSignOutError(
        "We could not reach Bazaar to close the session. Check your connection and sign out again.",
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="member-profile">
      <div className="member-profile__primary">
        <form className="member-form" onSubmit={save} noValidate aria-busy={isSaving}>
          <div className="member-form__head">
            <h3 className="member-form__title">Display name</h3>
            {dirty ? (
              <p className="member-dirty" data-dirty="true">
                <Icon.Pencil size={13} />
                Unsaved change
              </p>
            ) : (
              <p className="member-dirty" data-dirty="false">
                <Icon.CircleCheck size={13} />
                Saved
              </p>
            )}
          </div>

          <AuthTextField
            label="Full name"
            name="full_name"
            value={draft}
            onChange={(value) => {
              setDraft(value);
              if (error) setError(null);
            }}
            autoComplete="name"
            maxLength={NAME_MAX}
            error={error ?? undefined}
            inputRef={nameRef}
            hint={`Used on orders and receipts. ${NAME_MIN} to ${NAME_MAX} characters.`}
          />

          {saved ? <Alert tone="success" live title={saved} /> : null}

          <div className="member-form__actions">
            <Button type="submit" variant="cta" loading={isSaving} disabled={!dirty}>
              Save changes
            </Button>
            {dirty ? (
              <Button
                type="button"
                variant="quiet"
                onClick={() => {
                  setDraft(profile.full_name);
                  setError(null);
                  setSaved(null);
                  nameRef.current?.focus();
                }}
              >
                Revert
              </Button>
            ) : null}
          </div>
        </form>

        <div className="member-ro">
          <p className="member-ro__label">Email address</p>
          <p className="member-ro__value">{profile.email}</p>
          <p className="member-ro__note">
            Your email is the sign-in identity and cannot be edited from this screen: the account
            API accepts name changes only. To order under a different address you would open a
            second account.
          </p>
        </div>

        <div className="member-ro">
          <p className="member-ro__label">Password</p>
          <p className="member-ro__value mono">
            <Icon.Key size={14} />
            Managed on the Security tab
          </p>
          <p className="member-ro__note">
            Rotating a password revokes every session on the account, including this one.
          </p>
        </div>
      </div>

      <aside className="member-profile__aside" aria-labelledby="member-facts-title">
        <h3 className="member-aside__title" id="member-facts-title">
          Account record
        </h3>
        <dl className="member-facts">
          <div className="member-facts__row">
            <dt className="member-facts__term">Member since</dt>
            <dd className="member-facts__value">{formatDate(profile.created_at)}</dd>
          </div>
          <div className="member-facts__row">
            <dt className="member-facts__term">Account ref</dt>
            <dd className="member-facts__value num">{orderRef(profile.id)}</dd>
          </div>
          <div className="member-facts__row">
            <dt className="member-facts__term">Access</dt>
            <dd className="member-facts__value">
              <span className="member-role" data-role={profile.role}>
                {profile.role === "admin" ? <Icon.Shield size={13} /> : <Icon.User size={13} />}
                {profile.role === "admin" ? "Administrator" : "Customer"}
              </span>
            </dd>
          </div>
          <div className="member-facts__row">
            <dt className="member-facts__term">Standing</dt>
            <dd className="member-facts__value">
              <span className="member-flag" data-on={profile.is_active}>
                {profile.is_active ? <Icon.CircleCheck size={13} /> : <Icon.CircleX size={13} />}
                {profile.is_active ? "Active" : "Inactive"}
              </span>
            </dd>
          </div>
        </dl>

        {profile.role === "admin" ? (
          <Link className="member-quietlink" href="/admin">
            <Icon.Sliders size={15} />
            Admin console
          </Link>
        ) : null}

        <div className="member-signout">
          <p className="member-signout__note">
            Signs out this browser and asks the server to revoke the session.
          </p>
          {signOutError ? <Alert tone="error" title={signOutError} /> : null}
          <Button
            type="button"
            variant="outline"
            block
            icon={<Icon.LogOut size={17} />}
            loading={isSigningOut}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </aside>
    </div>
  );
}

/** Used by the dashboard header so the avatar and the panels never disagree. */
export function MemberIdentity({ profile }: { profile: UserProfile }) {
  return (
    <div className="member-id">
      <span className="avatar avatar--lg" aria-hidden="true">
        {initialsOf(profile.full_name)}
      </span>
      <span className="member-id__text">
        <span className="member-id__name">{profile.full_name}</span>
        <span className="member-id__mail">{profile.email}</span>
      </span>
    </div>
  );
}
