import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";

const distRoot = new URL("../dist/", import.meta.url);
const configRoot = new URL("config/", distRoot);
const configJsonUrl = new URL("platform-config-check.json", configRoot);
const configMarkdownUrl = new URL("platform-config-check.md", configRoot);

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

async function exists(path) {
  if (!path) {
    return false;
  }
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function status({ present, placeholder = false, valid = true }) {
  if (!present) {
    return "missing";
  }
  if (placeholder) {
    return "placeholder";
  }
  return valid ? "ready" : "invalid";
}

function redacted(name) {
  const value = env(name);
  return {
    name,
    present: Boolean(value),
    value: value ? "<redacted>" : ""
  };
}

const steamcmdPath = env("STEAMCMD_PATH");
const steamAppId = env("STEAM_APP_ID", "000000");
const steamDepotId = env("STEAM_DEPOT_ID", "000001");
const steamBranch = env("STEAM_BRANCH", "prototype");
const playtestBranch = env("PLAYTEST_BRANCH", "private-beta");
const playtestFeedbackUrl = env("PLAYTEST_FEEDBACK_URL", "TBD");
const playtestFeedbackMode = env("PLAYTEST_FEEDBACK_MODE", playtestFeedbackUrl === "TBD" ? "local-archive" : "url");
const playtestFeedbackDir = env("PLAYTEST_FEEDBACK_DIR", "playtest-feedback-inbox");
const storePageState = env("STORE_PAGE_STATE", "draft");
const storeLanguages = env("STORE_LANGUAGES", "English,French,German,Spanish - Latin America,Japanese");
const steamcmdExists = await exists(steamcmdPath);

const checks = [
  {
    name: "STEAM_APP_ID",
    value: steamAppId,
    status: status({ present: Boolean(steamAppId), placeholder: steamAppId === "000000", valid: /^\d+$/.test(steamAppId) }),
    note: "Real Steam app id for upload and submission."
  },
  {
    name: "STEAM_DEPOT_ID",
    value: steamDepotId,
    status: status({ present: Boolean(steamDepotId), placeholder: steamDepotId === "000001", valid: /^\d+$/.test(steamDepotId) }),
    note: "Real Steam depot id for upload and submission."
  },
  {
    name: "STEAM_BRANCH",
    value: steamBranch,
    status: status({ present: Boolean(steamBranch) }),
    note: "Target branch for depot planning."
  },
  {
    name: "STEAMCMD_PATH",
    value: steamcmdPath || "",
    status: status({ present: Boolean(steamcmdPath), valid: steamcmdExists }),
    note: "Local SteamCMD executable path for real uploads."
  },
  {
    ...redacted("STEAM_USERNAME"),
    status: status({ present: Boolean(env("STEAM_USERNAME")) }),
    note: "Build account username. Redacted in generated reports."
  },
  {
    ...redacted("STEAM_PASSWORD"),
    status: status({ present: Boolean(env("STEAM_PASSWORD")) }),
    note: "Build account password. Redacted in generated reports."
  },
  {
    name: "STEAM_UPLOAD",
    value: env("STEAM_UPLOAD") || "",
    status: env("STEAM_UPLOAD") === "1" ? "ready" : "dry-run",
    note: "Must be 1 for real uploads; dry-run is expected for local checks."
  },
  {
    name: "PLAYTEST_BRANCH",
    value: playtestBranch,
    status: status({ present: Boolean(playtestBranch) }),
    note: "Private beta branch name used in playtest commands."
  },
  {
    name: "PLAYTEST_FEEDBACK_MODE",
    value: playtestFeedbackMode,
    status: status({ present: Boolean(playtestFeedbackMode), valid: ["local-archive", "url"].includes(playtestFeedbackMode) }),
    note: "Feedback intake mode: local archive JSON handoff or hosted URL."
  },
  {
    name: "PLAYTEST_FEEDBACK_URL",
    value: playtestFeedbackUrl,
    status: status({
      present: Boolean(playtestFeedbackUrl),
      placeholder: playtestFeedbackMode === "url" && playtestFeedbackUrl === "TBD"
    }),
    note: "Live feedback intake shown in playtest plans."
  },
  {
    name: "PLAYTEST_FEEDBACK_DIR",
    value: playtestFeedbackDir,
    status: status({ present: Boolean(playtestFeedbackDir) }),
    note: "Local inbox folder for exported feedback packets when mode is local-archive."
  },
  {
    name: "STORE_PAGE_STATE",
    value: storePageState,
    status: status({ present: Boolean(storePageState) }),
    note: "Store page planning state label."
  },
  {
    name: "STORE_LANGUAGES",
    value: storeLanguages,
    status: status({ present: Boolean(storeLanguages) }),
    note: "Comma-separated localization target list."
  }
];

const blockers = checks
  .filter((check) => ["missing", "placeholder", "invalid"].includes(check.status) && ["STEAM_APP_ID", "STEAM_DEPOT_ID"].includes(check.name))
  .map((check) => `${check.name} is ${check.status}.`);
const uploadPrerequisites = checks
  .filter((check) => ["missing", "invalid"].includes(check.status) && ["STEAMCMD_PATH", "STEAM_USERNAME", "STEAM_PASSWORD"].includes(check.name))
  .map((check) => `${check.name} is ${check.status}.`);
const betaPrerequisites = checks
  .filter((check) => ["PLAYTEST_FEEDBACK_MODE", "PLAYTEST_FEEDBACK_URL", "PLAYTEST_FEEDBACK_DIR"].includes(check.name) && ["missing", "placeholder", "invalid"].includes(check.status))
  .map((check) => `${check.name} is still ${check.value}.`);

const report = {
  generatedAt: new Date().toISOString(),
  readyForDryRun: blockers.length === 0 || (steamAppId === "000000" && steamDepotId === "000001"),
  readyForRealUpload: blockers.length === 0 && uploadPrerequisites.length === 0 && env("STEAM_UPLOAD") === "1",
  checks,
  blockers,
  uploadPrerequisites,
  betaPrerequisites
};

function makeMarkdown(data) {
  const rows = data.checks
    .map((check) => `| \`${check.name}\` | ${check.status} | \`${check.value || ""}\` | ${check.note} |`)
    .join("\n");
  const blockersText = data.blockers.length ? data.blockers.map((item) => `- ${item}`).join("\n") : "- None";
  const uploadText = data.uploadPrerequisites.length ? data.uploadPrerequisites.map((item) => `- ${item}`).join("\n") : "- None";
  const betaText = data.betaPrerequisites.length ? data.betaPrerequisites.map((item) => `- ${item}`).join("\n") : "- None";

  return `# Platform Config Check

- Generated: ${data.generatedAt}
- Ready for dry run: ${data.readyForDryRun ? "yes" : "no"}
- Ready for real upload: ${data.readyForRealUpload ? "yes" : "no"}

## Checks

| Variable | Status | Value | Note |
| --- | --- | --- | --- |
${rows}

## Blockers

${blockersText}

## Upload Prerequisites

${uploadText}

## Beta Prerequisites

${betaText}
`;
}

await mkdir(configRoot, { recursive: true });
await writeFile(configJsonUrl, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(configMarkdownUrl, makeMarkdown(report));

console.log("Platform config check written to dist/config/platform-config-check.json and dist/config/platform-config-check.md");
