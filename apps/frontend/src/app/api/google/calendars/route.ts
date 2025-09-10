import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { makeGoogleApiCall } from "~/lib/token-manager";

type SessionWithTokens = {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  expires: string;
  access_token: string | null;
  refresh_token?: string;
  expires_at?: number;
};

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const res = await makeGoogleApiCall(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {},
        cache: "no-store",
      },
      session.user.id,
    );

    if (!res.ok) {
      const text = await res.text();

      // Handle specific error cases
      if (res.status === 401) {
        return NextResponse.json(
          {
            error: "token_expired",
            message: "Please reconnect Google Calendar",
          },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: "google_error", detail: text },
        { status: 500 },
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Calendar API error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch calendars" },
      { status: 500 },
    );
  }
}
