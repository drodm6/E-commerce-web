import { loadConfig } from "./config.js";
import { openDatabase } from "./db.js";
import { createApp } from "./app.js";

const config = loadConfig();
const db = openDatabase(config.dbPath);
const app = createApp({ config, db });

const server = app.listen(config.port, () => {
  console.log(`Frost API running on http://localhost:${config.port}`);
  if (!config.admin.passwordHash) console.log("⚠  Admin sign-in not set up yet — run: npm run setup-admin");
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
