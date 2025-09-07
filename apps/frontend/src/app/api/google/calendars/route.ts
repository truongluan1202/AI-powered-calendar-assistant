import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/app/api/auth/[...nextauth]/route";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  if (!session || !(session as any).access_token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).access_token as string;
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
  const data = await res.json();
  return NextResponse.json(data);
}
