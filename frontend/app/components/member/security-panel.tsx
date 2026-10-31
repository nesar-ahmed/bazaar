"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { AuthPasswordField } from "@/app/components/member/auth-fields";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordLengthError,
  passwordRuleLine,
} from "@/app/components/member/password-rules";
import { signOutAndRedirect } from "@/app/components/member/session";
import { Button } from "@/app/components/ui/button";
import { Alert } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { ApiError, apiSend } from "@/lib/client-api";

type Key = "current_password" | "new_password" | "confirm_password";
type Errors = Partial<Record<Key, string>>;
const ORDER: Key[] = ["current_password", "new_password", "confirm_password"];

/** Security tab. A password change revokes every session server-side, so the
 *  success path is a sign-out, not a toast. */
export function SecurityPanel() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [shown, setShown] = useState<Record<Key, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  function focusKey(key: Key | null) {
    if (!key) return;
    const node =
      key === "current_password"
        ? currentRef.current
        : key === "new_password"
          ? nextRef.current
          : confirmRef.current;
    node?.focus();
  }

  function check(): { found: Errors; key: Key | null } {
    const found: Errors = {};
    if (current.length === 0) found.current_password = "Enter your current password.";
    else {
      const lengthError = passwordLengthError(current, "Your current password");
      if (lengthError) found.current_password = lengthError;
    }

    if (next.length === 0) found.new_password = "Choose a new password.";
    else {
      const lengthError = passwordLengthError(next, "The new password");
      if (lengthError) found.new_password = lengthError;
    }

    if (next.length > 0 && current.length > 0 && next === current) {
      found.new_password = "Pick something different. The new password cannot match the current one.";
    }

    if (confirm.length === 0) found.confirm_password = "Type the new password again to confirm it.";
    else if (confirm !== next) found.confirm_password = "The two new passwords do not match yet.";

    return { found, key: ORDER.find((entry) => Boolean(found[entry])) ?? null };
  }

  function update(key: Key, value: string) {
    if (key === "current_password") setCurrent(value);
    else if (key === "new_password") setNext(value);
    else setConfirm(value);
    if (problem) setProblem(null);
    setErrors((existing) => {
      if (!existing[key]) return existing;
      const clone = { ...existing };
      delete clone[key];
      return clone;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setProblem(null);

    const { found, key } = check();
    setErrors(found);
    if (key) {
      focusKey(key);
      return;
    }

    setIsSaving(true);
    try {
      // 204 has no body, so nothing is parsed here.
      await apiSend<void>("users/change-password", {
        current_password: current,
        new_password: next,
      });
      // The server has revoked every session by now: sign this device out too
      // and explain it on the sign-in page.
      await signOutAndRedirect(router, { notice: "password-changed" });
      return;
    } catch (reason) {
      const status = reason instanceof ApiError ? reason.status : 0;
      const message =
        reason instanceof ApiError
          ? reason.message
          : "We could not reach Bazaar. Nothing was changed.";
      const lower = message.toLowerCase();

      if (status === 401) {
        setProblem(`${message} Sign in again, then change the password from the Security tab.`);
        focusKey("current_password");
      } else if (lower.includes("current password is incorrect")) {
        setErrors({ current_password: "That is not your current password." });
        setProblem(message);
        focusKey("current_password");
      } else if (lower.includes("different from the current")) {
        setErrors({ new_password: "Choose a password you have not used on this account." });
        setProblem(message);
        focusKey("new_password");
      } else if (status === 422) {
        setErrors({ new_password: message });
        focusKey("new_password");
      } else {
        setProblem(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="member-security">
      <Alert
        tone="warn"
        title="Changing your password signs you out everywhere."
      >
        The moment it is accepted, the account revokes every active session, including this browser.
        You will land on the sign-in page with a message confirming it.
      </Alert>

      <form className="member-form member-security__form" onSubmit={submit} noValidate aria-busy={isSaving}>
        <h3 className="member-form__title">Change password</h3>

        {problem ? <Alert tone="error" title={problem} /> : null}

        <div className="member-security__fields">
          <AuthPasswordField
            label="Current password"
            name="current_password"
            value={current}
            onChange={(value) => update("current_password", value)}
            autoComplete="current-password"
            maxLength={PASSWORD_MAX}
            error={errors.current_password}
            inputRef={currentRef}
            shown={shown.current_password}
            onToggle={() =>
              setShown((state) => ({ ...state, current_password: !state.current_password }))
            }
          />

          <AuthPasswordField
            label="New password"
            name="new_password"
            value={next}
            onChange={(value) => update("new_password", value)}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            error={errors.new_password}
            inputRef={nextRef}
            shown={shown.new_password}
            onToggle={() => setShown((state) => ({ ...state, new_password: !state.new_password }))}
            rule={passwordRuleLine(next)}
            hint={`Between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters, and different from the one you use now.`}
          />

          <AuthPasswordField
            label="Confirm new password"
            name="confirm_password"
            value={confirm}
            onChange={(value) => update("confirm_password", value)}
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            error={errors.confirm_password}
            inputRef={confirmRef}
            shown={shown.confirm_password}
            onToggle={() =>
              setShown((state) => ({ ...state, confirm_password: !state.confirm_password }))
            }
            rule={
              confirm.length > 0 && !errors.confirm_password
                ? { state: "ok", text: "Matches the new password." }
                : confirm.length > 0
                  ? { state: "short", text: "Still different from the new password." }
                  : { state: "idle", text: "Type the new password a second time." }
            }
          />
        </div>

        <div className="member-form__actions">
          <Button type="submit" variant="cta" loading={isSaving} icon={<Icon.Key size={17} />}>
            Change password
          </Button>
          <p className="member-security__footnote">
            This is the last field the account API lets you change yourself.
          </p>
        </div>
      </form>
    </div>
  );
}
