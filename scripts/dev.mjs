// npm run dev → starts the API server (auto-restarts on changes) and the website together.
import { spawn } from "node:child_process";

const win = process.platform === "win32";
const procs = [
  spawn(process.execPath, ["--watch-path=server", "--watch-path=shared", "server/index.js"], { stdio: "inherit" }),
  spawn(win ? "npx.cmd" : "npx", ["vite"], { stdio: "inherit", shell: win }),
];
const stop = () => procs.forEach((p) => p.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", (code) => code && stop()));
