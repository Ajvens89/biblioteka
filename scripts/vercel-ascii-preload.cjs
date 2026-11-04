/**
 * Preload for Vercel CLI: Windows hostname with non-ASCII (e.g. Ambroży)
 * breaks HTTP User-Agent headers.
 * Usage: node --require ./scripts/vercel-ascii-preload.cjs <vercel-bin> ...
 */
// Node --require preloads must remain synchronous CommonJS modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("node:os");
const asciiHost = process.env.VERCEL_ASCII_HOST || "localhost";
const asciiUser = process.env.VERCEL_ASCII_USER || "ajven";
os.hostname = function patchedHostname() {
  return asciiHost;
};
const real = os.userInfo.bind(os);
os.userInfo = function patchedUserInfo(options) {
  const info = real(options);
  return Object.assign({}, info, { username: asciiUser });
};
