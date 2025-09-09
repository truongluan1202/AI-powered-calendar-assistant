#!/usr/bin/env node

/**
 * Database fix script
 * This script will reset and recreate the database schema
 */

const { execSync } = require("child_process");

console.log("🔧 Fixing database schema...");

try {
  // Generate Prisma client
  console.log("📦 Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit" });

  // Push schema to database (this will create missing tables/columns)
  console.log("🗄️  Pushing schema to database...");
  console.log(
    "⚠️  WARNING: This will reset the database and lose all existing data!",
  );
  execSync("npx prisma db push --force-reset", { stdio: "inherit" });

  console.log("✅ Database schema fixed successfully!");
  console.log("🚀 You can now deploy to Vercel.");
} catch (error) {
  console.error("❌ Error fixing database:", error.message);
  process.exit(1);
}
