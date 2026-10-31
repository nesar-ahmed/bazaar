"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/app/components/ui/button";
import { Icon } from "@/app/components/ui/icons";

/** Sign out from the access panel. Uses the same BFF auth route the account
 *  screen uses, then tells the cart provider the session changed. */
export function SignOutButton({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function signOut() {
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const body = (await response.json().catch(() => null)) as { warning?: string } | null;
      window.dispatchEvent(new Event("bazaar:auth-changed"));
      if (!response.ok) {
        setProblem(body?.warning ?? "The console could not sign you out. Try again.");
        return;
      }
      if (body?.warning) setProblem(body.warning);
      router.replace(next);
      router.refresh();
    } catch {
      setProblem("The console could not reach the server. Nothing was signed out.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="ops-signout">
      <Button
        variant="outline"
        size="sm"
        icon={<Icon.LogOut size={15} />}
        loading={busy}
        onClick={() => void signOut()}
      >
        Sign out
      </Button>
      {problem ? (
        <span className="tiny" role="status">
          {problem}
        </span>
      ) : null}
    </span>
  );
}
