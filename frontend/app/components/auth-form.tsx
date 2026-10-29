"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

type AuthResponse = {
  error?: string;
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      ...(isRegister ? { full_name: String(formData.get("full_name") ?? "") } : {}),
    };

    try {
      const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as AuthResponse;
      if (!response.ok) {
        setError(body.error ?? "We could not complete your request. Please try again.");
        return;
      }
      router.replace("/account");
      router.refresh();
    } catch {
      setError("We could not reach Bazaar. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {isRegister && (
        <label>
          Your name
          <input
            autoComplete="name"
            name="full_name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Alex Morgan"
          />
        </label>
      )}
      <label>
        Email address
        <input
          autoComplete="email"
          name="email"
          type="email"
          required
          maxLength={320}
          placeholder="you@example.com"
        />
      </label>
      <label>
        Password
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={32}
          placeholder={isRegister ? "At least 8 characters" : "Your password"}
        />
      </label>
      {isRegister && (
        <p className="form-hint">
          Use 8–32 characters. Keep your password private.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-dark auth-submit" disabled={isSubmitting} type="submit">
        {isSubmitting
          ? "Please wait…"
          : isRegister
            ? "Create your account"
            : "Sign in"}
        {!isSubmitting && <span aria-hidden="true">↗</span>}
      </button>
      <p className="auth-switch">
        {isRegister ? "Already have an account?" : "New to Bazaar?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
