import http from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.GOOGLE_WORKSPACE_OAUTH_PORT || 8765);
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const TOKEN_OUTPUT = "/tmp/wrenchready-google-workspace-refresh-token.txt";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function parseEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^"|"$/g, "");
    env[match[1]] = value;
  }
  return env;
}

async function loadLocalEnv() {
  const path = resolve(".env.local");
  if (!existsSync(path)) return {};
  return parseEnv(await readFile(path, "utf8"));
}

function openUrl(url) {
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(command, args, { stdio: "ignore", detached: true }).unref();
}

async function exchangeCodeForToken({ code, clientId, clientSecret }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body.refresh_token) {
    throw new Error(body.error_description || body.error || "Google did not return a refresh token.");
  }

  return body.refresh_token;
}

async function main() {
  const env = { ...process.env, ...(await loadLocalEnv()) };
  const clientId = env.GOOGLE_WORKSPACE_CLIENT_ID || env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_WORKSPACE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_WORKSPACE_CLIENT_ID and GOOGLE_WORKSPACE_CLIENT_SECRET in .env.local.");
    console.error(`Add ${REDIRECT_URI} as an authorized redirect URI in the Google OAuth client.`);
    process.exit(1);
  }

  const state = Math.random().toString(36).slice(2);
  const consentUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  })}`;

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", REDIRECT_URI);
      if (url.pathname !== "/callback") {
        response.writeHead(404).end("Not found");
        return;
      }
      if (url.searchParams.get("state") !== state) {
        response.writeHead(400).end("Invalid OAuth state.");
        return;
      }
      const code = url.searchParams.get("code");
      if (!code) {
        response.writeHead(400).end("Missing OAuth code.");
        return;
      }

      const refreshToken = await exchangeCodeForToken({ code, clientId, clientSecret });
      await writeFile(TOKEN_OUTPUT, `${refreshToken}\n`, { mode: 0o600 });
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(`
        <main style="font-family: system-ui; max-width: 680px; margin: 64px auto; line-height: 1.5;">
          <h1>Jeff Google Workspace OAuth complete</h1>
          <p>The refresh token was saved locally for Codex to install as an environment variable.</p>
          <p>You can close this tab.</p>
        </main>
      `);
      server.close();
      console.log(`Google Workspace refresh token saved to ${TOKEN_OUTPUT}`);
    } catch (error) {
      response.writeHead(500).end(error instanceof Error ? error.message : "OAuth failed.");
      server.close();
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Opening Google OAuth consent. Redirect URI: ${REDIRECT_URI}`);
    openUrl(consentUrl);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
