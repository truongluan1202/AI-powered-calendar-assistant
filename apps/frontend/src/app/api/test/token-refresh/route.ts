import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import {
  runTokenRefreshTestSuite,
  testTokenRefresh,
  forceTokenExpiration,
} from "~/lib/test-token-refresh";

/**
 * Test API route for verifying token refresh functionality
 *
 * Usage:
 * GET /api/test/token-refresh - Run basic token refresh test
 * POST /api/test/token-refresh - Run full test suite
 * PUT /api/test/token-refresh - Force token expiration for testing
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await testTokenRefresh(session.user.id);

    return NextResponse.json({
      test: "Basic token refresh test",
      ...result,
    });
  } catch (error) {
    console.error("Token refresh test error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runTokenRefreshTestSuite(session.user.id);

    return NextResponse.json({
      test: "Full token refresh test suite",
      ...result,
    });
  } catch (error) {
    console.error("Token refresh test suite error:", error);
    return NextResponse.json(
      {
        error: "Test suite failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await forceTokenExpiration(session.user.id);

    return NextResponse.json({
      test: "Force token expiration",
      ...result,
    });
  } catch (error) {
    console.error("Force token expiration error:", error);
    return NextResponse.json(
      {
        error: "Force expiration failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
