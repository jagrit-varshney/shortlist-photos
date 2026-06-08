/**
 * Creates the first admin account.
 * Usage: npx tsx scripts/seed.ts
 *
 * Set PHOTOS_ROOT and DATABASE_PATH in .env.local first.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import readline from "readline/promises";
import { getDb } from "../lib/db";

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("=== Create admin account ===\n");
  const name = await rl.question("Name: ");
  const email = await rl.question("Email: ");
  const password = await rl.question("Password: ");
  rl.close();

  if (!name || !email || !password) {
    console.error("All fields required.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  const db = getDb();

  try {
    db.prepare(
      "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')"
    ).run(email, name, hash);
    console.log(`\nAdmin account created for ${email}`);
  } catch {
    console.error("User with that email already exists.");
    process.exit(1);
  }
}

main();
