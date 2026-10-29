import { cookies } from "next/headers";

export const ACCESS_TOKEN_COOKIE = "bazaar_access_token";

export type UserProfile = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
};

export function getApiUrl(): string {
  return (process.env.API_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${getApiUrl()}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as UserProfile;
  } catch {
    return null;
  }
}
