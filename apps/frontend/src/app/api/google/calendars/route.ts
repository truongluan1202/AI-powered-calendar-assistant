import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";

type SessionWithTokens = {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  expires: string;
  access_token: string | null;
  refresh_token?: string;
  expires_at?: number;
};

export async function GET(_req: NextRequest) {
  const session = (await getServerSession(
    authOptions,
  )) as unknown as SessionWithTokens | null;
  if (!session?.access_token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accessToken = session.access_token;
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "google_error", detail: text },
      { status: 500 },
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return NextResponse.json(data);
}
