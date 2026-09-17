// Entry point for hosts that expect a server file at the repository root —
// Hostinger's Node.js web apps look for one. The server itself lives in
// infra/node/server.js, which finds dist/ relative to its own location, so
// starting it from here or from there behaves identically.
import "./infra/node/server.js";
