import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

import { authOptions } from "~/server/auth";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const handler = NextAuth(authOptions as NextAuthOptions);
export { handler as GET, handler as POST };
