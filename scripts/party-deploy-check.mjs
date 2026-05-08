import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const packagePath = resolve(root, "package.json");
const railwayPath = resolve(root, "railway.json");
const serverPath = resolve(root, "server.js");
const distRoot = resolve(root, "dist", "party");
const jsonPath = join(distRoot, "party-deploy-check.json");
const markdownPath = join(distRoot, "party-deploy-check.md");

const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const railway = JSON.parse(await readFile(railwayPath, "utf8"));
const serverSource = await readFile(serverPath, "utf8");

const checks = [
  check("Railway Config", Boolean(railway.deploy), "railway.json has a deploy section."),
  check("Build Builder", railway.build?.builder === "RAILPACK", "Railway uses Railpack for the Node party server."),
  check("Start Command", railway.deploy?.startCommand === "node server.js", "Railway starts the party server directly with node server.js."),
  check("Healthcheck Path", railway.deploy?.healthcheckPath === "/healthz", "Railway health check points at /healthz."),
  check("Healthcheck Timeout", Number(railway.deploy?.healthcheckTimeout ?? 0) >= 30, "Railway health check timeout leaves room for cold starts."),
  check("Restart Policy", railway.deploy?.restartPolicyType === "ON_FAILURE", "Railway restarts failed party server processes."),
  check("Package Start Script", packageJson.scripts?.start === "node server.js", "package.json start script runs the party server."),
  check("Party Serve Script", packageJson.scripts?.["serve:party"] === "node server.js", "Local party server entrypoint matches production."),
  check("Party Readiness Script", Boolean(packageJson.scripts?.["party:readiness"]), "party:readiness exists for pre-party checks."),
  check("Party Server Smoke", Boolean(packageJson.scripts?.["party:server-smoke"]), "party:server-smoke exists for host/phone relay checks."),
  check("Remote Party Smoke", Boolean(packageJson.scripts?.["party:remote-smoke"]), "party:remote-smoke exists for deployed Railway URL checks."),
  check("Socket.IO Dependency", Boolean(packageJson.dependencies?.["socket.io"]), "Socket.IO server dependency is declared."),
  check("Socket.IO Client Dependency", Boolean(packageJson.dependencies?.["socket.io-client"]), "Socket.IO client dependency is declared for local smoke tests."),
  check("QR Dependency", Boolean(packageJson.dependencies?.qrcode), "QR code dependency is declared for phone join links."),
  check("PORT Binding", serverSource.includes("process.env.PORT") && serverSource.includes("server.listen(port"), "server.js reads Railway PORT and listens through the configured port."),
  check("Public Bind", serverSource.includes('"0.0.0.0"'), "server.js binds 0.0.0.0 so Railway can route traffic."),
  check("Health Route", serverSource.includes('requestUrl.pathname === "/healthz"'), "server.js implements /healthz."),
  check("Host Route", serverSource.includes('requestUrl.pathname === "/host"'), "server.js implements /host."),
  check("Join Route", serverSource.includes('requestUrl.pathname === "/join"'), "server.js implements /join for phone controllers.")
];

const blockers = checks.filter((item) => item.status === "blocked");
const output = {
  app: "Afterlight Protocol",
  generatedAt: new Date().toISOString(),
  ready: blockers.length === 0,
  summary: {
    checks: checks.length,
    blocked: blockers.length
  },
  railway: {
    config: relative(root, railwayPath),
    startCommand: railway.deploy?.startCommand ?? null,
    healthcheckPath: railway.deploy?.healthcheckPath ?? null,
    builder: railway.build?.builder ?? null
  },
  checks,
  deploymentRunbook: [
    "Run npm run party:readiness locally before deploying.",
    "Connect the GitHub repo to Railway and deploy the main branch.",
    "Confirm Railway exposes a public domain for the service.",
    "Run npm run party:remote-smoke -- --url https://YOUR-RAILWAY-DOMAIN.",
    "Open https://YOUR-RAILWAY-DOMAIN/healthz and confirm ok true if the remote smoke fails.",
    "Open https://YOUR-RAILWAY-DOMAIN/host on the laptop, create a room, and scan the QR code from one phone.",
    "Run a one-phone controller smoke before guests arrive."
  ]
};

await mkdir(dirname(jsonPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
await writeFile(markdownPath, makeMarkdown(output));

console.log(`party deploy check ${output.ready ? "ready" : "blocked"}: ${output.summary.blocked} blockers`);
console.log(`wrote ${relative(root, jsonPath)} and ${relative(root, markdownPath)}`);

if (!output.ready) process.exit(1);

function check(area, ok, detail) {
  return {
    area,
    status: ok ? "ready" : "blocked",
    detail
  };
}

function makeMarkdown(data) {
  const rows = data.checks.map((item) => `| ${item.area} | ${item.status} | ${item.detail} |`).join("\n");
  const runbook = data.deploymentRunbook.map((item) => `- ${item}`).join("\n");
  return `# Party Deploy Check

- Generated: ${data.generatedAt}
- Ready: ${data.ready ? "yes" : "no"}
- Blockers: ${data.summary.blocked}
- Railway config: \`${data.railway.config}\`
- Start command: \`${data.railway.startCommand}\`
- Health check: \`${data.railway.healthcheckPath}\`
- Builder: \`${data.railway.builder}\`

## Checks

| Area | Status | Detail |
|---|---|---|
${rows}

## Deployment Runbook

${runbook}
`;
}
