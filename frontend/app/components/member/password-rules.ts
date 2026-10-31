/** Client-side mirror of the server password rules, plus the live requirement
 *  line copy used by sign-up and the change-password form. Rules are checked
 *  again by the API; this only moves the feedback next to the input. */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export type RuleState = "idle" | "short" | "long" | "ok";

export type RuleLine = { state: RuleState; text: string };

export function passwordRuleLine(value: string): RuleLine {
  const length = value.length;
  if (length === 0) {
    return { state: "idle", text: `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.` };
  }
  if (length < PASSWORD_MIN) {
    const missing = PASSWORD_MIN - length;
    return {
      state: "short",
      text: `${missing} more character${missing === 1 ? "" : "s"} to reach the ${PASSWORD_MIN} character minimum.`,
    };
  }
  if (length > PASSWORD_MAX) {
    const extra = length - PASSWORD_MAX;
    return { state: "long", text: `Trim ${extra} character${extra === 1 ? "" : "s"} to fit the ${PASSWORD_MAX} character limit.` };
  }
  return { state: "ok", text: `Length is within the ${PASSWORD_MIN} to ${PASSWORD_MAX} character range.` };
}

export function passwordLengthError(value: string, action = "Your password"): string | null {
  const length = value.length;
  if (length === 0) return `${action} cannot be empty.`;
  if (length < PASSWORD_MIN) {
    const missing = PASSWORD_MIN - length;
    return `${action} needs ${missing} more character${missing === 1 ? "" : "s"}. The minimum is ${PASSWORD_MIN}.`;
  }
  if (length > PASSWORD_MAX) return `${action} is over ${PASSWORD_MAX} characters. Shorten it.`;
  return null;
}
