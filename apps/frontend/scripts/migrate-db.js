#!/usr/bin/env node

/**
 * Safe database migration script
 * This script tries to migrate without losing data when possible
 */

const { execSync } = require("child_process");

console.log("🔧 Migrating database schema...");

try {
  // Generate Prisma client
  console.log("📦 Generating Prisma client...");
  execSync("npx prisma generate", { stdio: "inherit" });

  // Try to push schema without force reset first
  console.log("🗄️  Attempting to push schema to database...");
  try {
    execSync("npx prisma db push", { stdio: "inherit" });
    console.log("✅ Database schema updated successfully!");
  } catch (error) {
    console.log("⚠️  Schema push failed, attempting with force reset...");
    console.log(
      "⚠️  WARNING: This will reset the database and lose all existing data!",
    );

    // Ask for confirmation in non-CI environments
    if (!process.env.CI && !process.env.VERCEL) {
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        rl.question(
          "Do you want to continue? This will delete all data (y/N): ",
          resolve,
        );
      });

      rl.close();

      if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
        console.log("❌ Migration cancelled by user.");
        process.exit(0);
      }
    }

    execSync("npx prisma db push --force-reset", { stdio: "inherit" });
    console.log("✅ Database schema reset and updated successfully!");
  }

  console.log("🚀 Database migration complete!");
} catch (error) {
  console.error("❌ Error migrating database:", error.message);
  process.exit(1);
}
