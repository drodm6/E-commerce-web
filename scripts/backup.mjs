// npm run backup → saves a copy of the orders database and all uploaded
// photos into backups/<date-time>/. Safe to run while the shop is live.
import Database from "better-sqlite3";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { loadConfig, ROOT } from "../server/config.js";

const config = loadConfig();
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = path.join(process.env.BACKUP_DIR || path.join(ROOT, "backups"), stamp);
mkdirSync(dest, { recursive: true });

if (existsSync(config.dbPath)) {
  const db = new Database(config.dbPath, { readonly: true });
  await db.backup(path.join(dest, "frost.db")); // consistent copy, even mid-write
  db.close();
} else {
  console.log("No database yet — nothing to back up.");
}
if (existsSync(config.uploadsDir)) cpSync(config.uploadsDir, path.join(dest, "uploads"), { recursive: true });

console.log(`✓ Backup saved to ${dest}`);
