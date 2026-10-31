"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { AuthPasswordField, AuthTextField } from "@/app/components/member/auth-fields";
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordLengthError,
} from "@/app/components/member/password-rules";
import { signInHref, signUpHref, type AuthNotice } from "@/app/components/member/notices";
import { Button, ButtonLink } from "@/app/components/ui/button";
import { Alert } from "@/app/components/ui/display";
import { Icon } from "@/app/components/ui/icons";
import { ApiError, announceAuthChange, authRequest } from "@/lib/client-api";
import type { Role, UserProfile } from "@/lib/api-types";

const EMAIL_MAX = 320;
const NAME_MIN = 2;
const NAME_MAX = 120;

type FieldKey = "full_name" | "email" | "password";
type FieldErrors = Partial<Record<FieldKey, string>>;

type LoginResult = { ok: boolean; role: Role; cart_merge_warnings?: string[] };
type RegisterResult = { user: UserProfile; role: Role; cart_merge_warnings?: string[] };

type FormProblem = { tone: "error" | "warn"; title: string; body?: ReactNode; action?: ReactNode };

const NO_ERRORS: FieldErrors = {};

/** Same rules the API enforces. Checked here for speed, never trusted alone. */
function validate(values: { full_name: string; email: string; password: string }, isRegister: boolean): FieldErrors {
  const errors: FieldErrors = {};

  if (isRegister) {
    const name = values.full_name.trim();
    if (name.length === 0) errors.full_name = "Enter the name you want on your orders.";
    else if (name.length < NAME_MIN) errors.full_name = `A name needs at least ${NAME_MIN} characters.`;
    else if (name.length > NAME_MAX) errors.full_name = `A name is capped at ${NAME_MAX} characters. Trim it.`;
  }

  const email = values.email.trim();
  if (email.length === 0) errors.email = "Enter the email you sign in with.";
  else if (email.length > EMAIL_MAX) errors.email = `That email is longer than ${EMAIL_MAX} characters.`;
  else if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
    errors.email = "Enter a valid email address, like you@example.com.";
  }

  const password = values.password;
  if (password.length === 0) {
    errors.password = isRegister
      ? `Choose a password of at least ${PASSWORD_MIN} characters.`
      : "Enter your password.";
  } else {
    const lengthError = passwordLengthError(password, isRegister ? "That password" : "Your password");
    if (lengthError) errors.password = lengthError;
  }

  return errors;
}

/** The BFF maps Pydantic wording; turn it into something a person can act on. */
function rewriteFieldMessage(key: FieldKey, message: string): string {
  const lower = message.toLowerCase();
  if (key === "full_name") {
    if (lower.includes("short")) return `A name needs at least ${NAME_MIN} characters.`;
    if (lower.includes("long")) return `A name is capped at ${NAME_MAX} characters. Trim it.`;
    return "Enter the name you want on your orders.";
  }
  if (key === "email") {
    if (lower.includes("invalid") || lower.includes("email")) return "Enter a valid email address, like you@example.com.";
    if (lower.includes("long")) return `That email is longer than ${EMAIL_MAX} characters.`;
    return "Enter the email you sign in with.";
  }
  if (lower.includes("short")) return `A password starts at ${PASSWORD_MIN} characters.`;
  if (lower.includes("long")) return `A password stops at ${PASSWORD_MAX} characters. Trim it.`;
  return "Enter your password.";
}

export function AuthForm({
  mode,
  nextTarget = null,
  notice = null,
}: {
  mode: "login" | "register";
  /** Validated `?next=` from the server page: same-origin, relative only. */
  nextTarget?: string | null;
  notice?: AuthNotice | null;
}) {
  const router = useRouter();
  const isRegister = mode === "register";
  const order: FieldKey[] = isRegister ? ["full_name", "email", "password"] : ["email", "password"];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const selfHref = isRegister ? signUpHref({ next: nextTarget }) : signInHref({ next: nextTarget });
  const otherHref = isRegister ? signInHref({ next: nextTarget }) : signUpHref({ next: nextTarget });
  const otherLabel = isRegister ? "Sign in instead" : "Create an account";

  function values() {
    return { full_name: fullName, email, password };
  }

  /** State has not committed yet inside the change handler, so build the next
   *  value set explicitly. */
  function nextValues(key: FieldKey, value: string) {
    return {
      full_name: key === "full_name" ? value : fullName,
      email: key === "email" ? value : email,
      password: key === "password" ? value : password,
    };
  }

  function focusField(key: FieldKey | null) {
    if (!key) return;
    const node =
      key === "full_name" ? nameRef.current : key === "email" ? emailRef.current : passwordRef.current;
    node?.focus();
  }

  function firstKey(found: FieldErrors): FieldKey | null {
    return order.find((key) => Boolean(found[key])) ?? null;
  }

  function update(key: FieldKey, value: string) {
    if (key === "full_name") setFullName(value);
    else if (key === "email") setEmail(value);
    else setPassword(value);

    if (problem) setProblem(null);

    // After the first submit the messages track typing, so a fix clears itself.
    if (attempted) setErrors(validate(nextValues(key, value), isRegister));
  }

  async function finish(warnings: string[] | undefined) {
    if (warnings && warnings.length > 0) {
      try {
        window.sessionStorage.setItem("bazaar_cart_warnings", JSON.stringify(warnings));
      } catch {
        /* private browsing: the drawer still shows the merged cart itself */
      }
    }
    // The cart provider listens, clears the guest token, and re-reads the merged bag.
    announceAuthChange();
    router.replace(nextTarget ?? "/account");
    router.refresh();
  }

  function describeFailure(reason: unknown) {
    const status = reason instanceof ApiError ? reason.status : 0;
    const message =
      reason instanceof ApiError
        ? reason.message
        : "We could not reach Bazaar. Check your connection and try again.";
    const fields = reason instanceof ApiError ? reason.fields : {};
    return { status, message, fields };
  }

  function serverFieldErrors(fields: Record<string, string>): FieldErrors {
    const mapped: FieldErrors = {};
    for (const key of order) {
      const message = fields[key];
      if (typeof message === "string" && message.length > 0) mapped[key] = rewriteFieldMessage(key, message);
    }
    return mapped;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setAttempted(true);
    setProblem(null);

    const local = validate(values(), isRegister);
    setErrors(local);
    const invalidKey = firstKey(local);
    if (invalidKey) {
      focusField(invalidKey);
      return;
    }

    const payload = {
      email: email.trim().toLowerCase(),
      password,
      ...(isRegister ? { full_name: fullName.trim() } : {}),
    };

    setIsSubmitting(true);
    try {
      if (isRegister) {
        const result = await authRequest<RegisterResult>("register", payload);
        await finish(result.cart_merge_warnings);
      } else {
        const result = await authRequest<LoginResult>("login", payload);
        await finish(result.cart_merge_warnings);
      }
      return;
    } catch (reason) {
      const { status, message, fields } = describeFailure(reason);
      const mapped = serverFieldErrors(fields);
      const stray = Object.keys(fields).filter((key) => !order.includes(key as FieldKey));

      if (status === 409 && isRegister) {
        mapped.email = "This email already has an account. Use it to sign in.";
      }
      setErrors(mapped);

      // Focus the first field the server named, otherwise the credential pair.
      focusField(firstKey(mapped) ?? (status === 401 ? "email" : null));

      if (status === 401 && !isRegister) {
        setProblem({
          tone: "error",
          title: message,
          body: "Check the address and the password, then try again. A failed attempt changes nothing on the account.",
          action: (
            <ButtonLink href={otherHref} variant="quiet" size="sm">
              {otherLabel}
            </ButtonLink>
          ),
        });
      } else if (status === 409 && isRegister) {
        setProblem({
          tone: "error",
          title: message,
          body: "Sign in with that address and the bag on this device merges into the account.",
          action: (
            <ButtonLink href={otherHref} variant="quiet" size="sm">
              Sign in
            </ButtonLink>
          ),
        });
      } else if (status === 503 || status === 0) {
        setProblem({
          tone: "error",
          title: status === 503 ? message : "We could not reach Bazaar.",
          body: "Nothing was saved. The account service is not answering right now, so try again in a moment.",
          action: (
            <Button type="submit" variant="outline" size="sm">
              Try again
            </Button>
          ),
        });
      } else if (status === 502 && isRegister) {
        setProblem({
          tone: "warn",
          title: message,
          body: "The account exists. Use the same email and password to sign in.",
          action: (
            <ButtonLink href={signInHref({ next: nextTarget })} variant="quiet" size="sm">
              Sign in
            </ButtonLink>
          ),
        });
      } else {
        setProblem({
          tone: "error",
          title: message,
          body:
            Object.keys(mapped).length > 0 || stray.length > 0
              ? "Fix the fields marked below, then submit again."
              : "Nothing was saved. Check the details below, then submit again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit} noValidate aria-busy={isSubmitting}>
      {notice ? (
        <Alert
          tone={notice.tone}
          title={notice.title}
          action={
            <ButtonLink href={selfHref} variant="quiet" size="sm">
              Dismiss message
            </ButtonLink>
          }
        >
          {notice.body}
        </Alert>
      ) : null}

      {problem ? (
        <Alert tone={problem.tone} title={problem.title} action={problem.action}>
          {problem.body}
        </Alert>
      ) : null}

      <div className="auth-form__fields">
        {isRegister ? (
          <AuthTextField
            label="Full name"
            name="full_name"
            value={fullName}
            onChange={(value) => update("full_name", value)}
            autoComplete="name"
            placeholder="Full name"
            maxLength={NAME_MAX}
            error={errors.full_name}
            inputRef={nameRef}
          />
        ) : null}

        <AuthTextField
          label="Email address"
          name="email"
          type="email"
          value={email}
          onChange={(value) => update("email", value)}
          autoComplete="email"
          placeholder="Email address"
          maxLength={EMAIL_MAX}
          error={errors.email}
          inputRef={emailRef}
        />

        <AuthPasswordField
          label={isRegister ? "Choose a password" : "Password"}
          name="password"
          value={password}
          onChange={(value) => update("password", value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder={isRegister ? "8 to 28 characters" : "Password"}
          maxLength={PASSWORD_MAX}
          error={errors.password}
          inputRef={passwordRef}
          shown={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
        />
      </div>

      <div className="auth-form__foot">
        <Button type="submit" variant="cta" size="lg" block loading={isSubmitting} icon={<Icon.ArrowRight size={17} />}>
          {isRegister ? "Create account" : "Sign in"}
        </Button>
        <p className="auth__switch">
          {isRegister ? "Already have an account?" : "New to Bazaar?"}{" "}
          <Link className="link" href={otherHref}>
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </form>
  );
}

export default AuthForm;
