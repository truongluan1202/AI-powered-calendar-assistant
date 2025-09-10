/**
 * Test utilities for verifying token refresh functionality
 * Use these to test the automatic token refresh system
 */

import { db } from "~/server/db";
import { getValidAccessToken, isTokenExpired } from "./token-manager";

/**
 * Test function to verify token refresh is working
 * Call this from an API route or server component for testing
 */
export async function testTokenRefresh(userId: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log("🧪 Testing token refresh for user:", userId);

    // 1. Get current account info
    const account = await db.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    if (!account) {
      return {
        success: false,
        message: "No Google account found for user",
      };
    }

    const initialToken = account.access_token;
    const initialExpiresAt = account.expires_at;
    const isCurrentlyExpired = isTokenExpired(initialExpiresAt);

    console.log("📊 Initial token state:", {
      hasToken: !!initialToken,
      expiresAt: initialExpiresAt,
      isExpired: isCurrentlyExpired,
      timeUntilExpiry: initialExpiresAt
        ? initialExpiresAt - Math.floor(Date.now() / 1000)
        : "unknown",
    });

    // 2. Get valid access token (this will refresh if needed)
    const tokenResult = await getValidAccessToken(userId);

    if (!tokenResult.success) {
      return {
        success: false,
        message: `Failed to get valid token: ${tokenResult.error}`,
      };
    }

    // 3. Check if token was refreshed
    const updatedAccount = await db.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    const wasRefreshed = updatedAccount?.access_token !== initialToken;
    const newExpiresAt = updatedAccount?.expires_at;

    console.log("🔄 Token refresh result:", {
      wasRefreshed,
      newExpiresAt,
      timeUntilNewExpiry: newExpiresAt
        ? newExpiresAt - Math.floor(Date.now() / 1000)
        : "unknown",
    });

    return {
      success: true,
      message: wasRefreshed
        ? "Token was successfully refreshed"
        : "Token was still valid, no refresh needed",
      details: {
        initialExpiresAt,
        newExpiresAt,
        wasRefreshed,
        isCurrentlyExpired,
      },
    };
  } catch (error) {
    console.error("❌ Token refresh test failed:", error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Force token expiration for testing
 * This sets the expires_at to a past time to force a refresh
 */
export async function forceTokenExpiration(userId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    await db.account.updateMany({
      where: {
        userId,
        provider: "google",
      },
      data: {
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      },
    });

    return {
      success: true,
      message: "Token expiration forced for testing",
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to force expiration: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Test Google Calendar API call with automatic token refresh
 */
export async function testCalendarApiCall(userId: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const { makeGoogleApiCall } = await import("./token-manager");

    const response = await makeGoogleApiCall(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: {} },
      userId,
    );

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Calendar API call successful",
        details: {
          status: response.status,
          calendarCount: data.items?.length || 0,
        },
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Calendar API call failed: ${response.status} ${response.statusText}`,
        details: { error: errorText },
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Calendar API test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Comprehensive test suite for token refresh functionality
 */
export async function runTokenRefreshTestSuite(userId: string): Promise<{
  success: boolean;
  results: Array<{
    test: string;
    success: boolean;
    message: string;
    details?: any;
  }>;
}> {
  const results = [];

  // Test 1: Basic token refresh
  console.log("🧪 Running Test 1: Basic token refresh");
  const test1 = await testTokenRefresh(userId);
  results.push({
    test: "Basic token refresh",
    ...test1,
  });

  // Test 2: Force expiration and refresh
  console.log("🧪 Running Test 2: Force expiration and refresh");
  const forceResult = await forceTokenExpiration(userId);
  if (forceResult.success) {
    const test2 = await testTokenRefresh(userId);
    results.push({
      test: "Force expiration and refresh",
      ...test2,
    });
  } else {
    results.push({
      test: "Force expiration and refresh",
      success: false,
      message: `Failed to force expiration: ${forceResult.message}`,
    });
  }

  // Test 3: Calendar API call with refresh
  console.log("🧪 Running Test 3: Calendar API call with refresh");
  const test3 = await testCalendarApiCall(userId);
  results.push({
    test: "Calendar API call with refresh",
    ...test3,
  });

  const allPassed = results.every((r) => r.success);

  return {
    success: allPassed,
    results,
  };
}
