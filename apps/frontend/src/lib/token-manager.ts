import { db } from "~/server/db";
import { env } from "~/env.js";

export interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface RefreshResult {
  success: boolean;
  access_token?: string;
  error?: string;
}

/**
 * Checks if a token is expired or will expire soon (within 60 seconds)
 */
export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // 60 seconds buffer
  return expiresAt <= now + buffer;
}

/**
 * Refreshes a Google OAuth access token using the refresh token
 */
export async function refreshGoogleToken(
  refreshToken: string,
): Promise<RefreshResult> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Token refresh failed:", errorData);
      return {
        success: false,
        error: `Token refresh failed: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      access_token: data.access_token,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during token refresh",
    };
  }
}

/**
 * Gets a valid access token for a user, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<{
  success: boolean;
  access_token?: string;
  error?: string;
}> {
  try {
    // Get the user's Google account
    const account = await db.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    if (!account) {
      return {
        success: false,
        error: "No Google account found for user",
      };
    }

    if (!account.access_token || !account.refresh_token) {
      return {
        success: false,
        error: "No valid tokens found for user",
      };
    }

    // Check if token is expired or will expire soon
    if (!isTokenExpired(account.expires_at)) {
      // Token is still valid, return it
      return {
        success: true,
        access_token: account.access_token,
      };
    }

    // Token is expired or will expire soon, refresh it
    console.log("Token expired or expiring soon, refreshing...");
    const refreshResult = await refreshGoogleToken(account.refresh_token);

    if (!refreshResult.success || !refreshResult.access_token) {
      return {
        success: false,
        error: refreshResult.error || "Failed to refresh token",
      };
    }

    // Update the account with the new token
    const newExpiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    await db.account.update({
      where: {
        id: account.id,
      },
      data: {
        access_token: refreshResult.access_token,
        expires_at: newExpiresAt,
      },
    });

    console.log("Token refreshed successfully");
    return {
      success: true,
      access_token: refreshResult.access_token,
    };
  } catch (error) {
    console.error("Error getting valid access token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Makes a Google API call with automatic token refresh and retry
 * Implements the "one retry rule" strategy
 */
export async function makeGoogleApiCall(
  url: string,
  options: RequestInit,
  userId: string,
  retryCount = 0,
): Promise<Response> {
  const maxRetries = 1;

  // Get a valid access token
  const tokenResult = await getValidAccessToken(userId);

  if (!tokenResult.success || !tokenResult.access_token) {
    throw new Error(`Failed to get valid token: ${tokenResult.error}`);
  }

  // Make the API call with the token
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${tokenResult.access_token}`,
    },
  });

  // If we get a 401 and haven't retried yet, try refreshing and retrying
  if (response.status === 401 && retryCount < maxRetries) {
    console.log("Got 401, refreshing token and retrying...");

    // Force refresh the token (by marking it as expired)
    await db.account.updateMany({
      where: {
        userId,
        provider: "google",
      },
      data: {
        expires_at: Math.floor(Date.now() / 1000) - 1, // Mark as expired
      },
    });

    // Retry the call
    return makeGoogleApiCall(url, options, userId, retryCount + 1);
  }

  return response;
}
