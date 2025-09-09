# Fix NextAuth Prisma Schema Error

## Problem

The error shows that the `refresh_token_expires_in` field is missing from the Account model in your Prisma schema.

## Solution

I've already updated the Prisma schema to include the missing field. Now you need to apply this change to your database.

## Steps to Fix

1. **Update the database schema**:

   ```bash
   cd apps/frontend
   pnpm db:push
   ```

2. **Alternative: Create a migration** (if you prefer migrations):

   ```bash
   cd apps/frontend
   pnpm db:migrate dev --name add-refresh-token-expires-in
   ```

3. **Restart your development server**:

   ```bash
   pnpm dev
   ```

4. **Test the authentication again**:
   - Visit: `http://localhost:3000/auth-test`
   - Try signing in with Google

## What Was Fixed

The Account model now includes:

```prisma
model Account {
  id                      String  @id @default(cuid())
  userId                  String
  type                    String
  provider                String
  providerAccountId       String
  refresh_token           String?
  access_token            String?
  expires_at              Int?
  token_type              String?
  scope                   String?
  id_token                String?
  session_state           String?
  refresh_token_expires_in Int?  // ← This field was added

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}
```

## Why This Happened

Google OAuth provides a `refresh_token_expires_in` field that indicates when the refresh token expires. The NextAuth Prisma adapter expects this field to be present in the Account model, but it wasn't included in the original schema.

After applying this fix, your Google OAuth authentication should work properly!
