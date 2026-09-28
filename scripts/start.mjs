// npm start → runs the server in production mode (secure cookies, HSTS,
// correct visitor IPs behind the host's proxy, strict secret checks),
// even if the host forgot to set NODE_ENV.
process.env.NODE_ENV ||= "production";
await import("../server/index.js");
