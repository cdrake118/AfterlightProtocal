import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const distRoot = new URL("../dist/", import.meta.url);
const replayRoot = new URL("replay/", distRoot);
const replayJsonUrl = new URL("replay-link-check.json", replayRoot);
const replayMarkdownUrl = new URL("replay-link-check.md", replayRoot);

const contract = {
  requiredParams: ["map", "role", "duration", "bots", "seed"],
  maps: ["Observatory Annex", "Tideglass Aquarium", "Prism Foundry", "Gloamhall Manor", "Gloamhall Manor Compact"],
  roles: ["Investigator", "Anomaly"],
  durations: ["180", "300", "420"],
  botPressure: ["relaxed", "standard", "intense"],
  seedPattern: /^[A-F0-9]{8}$/
};

function makeReplayUrl({ map, role, duration, bots, seed }) {
  const url = new URL("https://playtest.afterlight.local/");
  url.searchParams.set("map", map);
  url.searchParams.set("role", role);
  url.searchParams.set("duration", duration);
  url.searchParams.set("bots", bots);
  url.searchParams.set("seed", seed);
  return url.href;
}

function validateReplayUrl(href) {
  const url = new URL(href);
  const missing = contract.requiredParams.filter((param) => !url.searchParams.has(param));
  assert.deepEqual(missing, [], `Replay URL missing params: ${missing.join(", ")}`);

  const map = url.searchParams.get("map");
  const role = url.searchParams.get("role");
  const duration = url.searchParams.get("duration");
  const bots = url.searchParams.get("bots");
  const seed = url.searchParams.get("seed");

  assert.ok(contract.maps.includes(map), `Unsupported replay map: ${map}`);
  assert.ok(contract.roles.includes(role), `Unsupported replay role: ${role}`);
  assert.ok(contract.durations.includes(duration), `Unsupported replay duration: ${duration}`);
  assert.ok(contract.botPressure.includes(bots), `Unsupported replay bot pressure: ${bots}`);
  assert.ok(contract.seedPattern.test(seed), `Replay seed must be 8 uppercase hex chars: ${seed}`);

  return { map, role, duration: Number(duration), bots, seed };
}

function makeScenarios() {
  return [
    {
      name: "default-investigator",
      setup: {
        map: "Observatory Annex",
        role: "Investigator",
        duration: "300",
        bots: "standard",
        seed: "1A2B3C4D"
      }
    },
    {
      name: "anomaly-foundry-intense",
      setup: {
        map: "Prism Foundry",
        role: "Anomaly",
        duration: "420",
        bots: "intense",
        seed: "FEEDC0DE"
      }
    },
    {
      name: "aquarium-short-relaxed",
      setup: {
        map: "Tideglass Aquarium",
        role: "Investigator",
        duration: "180",
        bots: "relaxed",
        seed: "00C0FFEE"
      }
    },
    {
      name: "manor-standard",
      setup: {
        map: "Gloamhall Manor",
        role: "Investigator",
        duration: "300",
        bots: "standard",
        seed: "A11C0DED"
      }
    }
  ].map((scenario) => {
    const href = makeReplayUrl(scenario.setup);
    return {
      ...scenario,
      href,
      parsed: validateReplayUrl(href)
    };
  });
}

function makeMarkdown(report) {
  const params = report.requiredParams.map((param) => `- \`${param}\``).join("\n");
  const scenarios = report.scenarios.map((scenario) => {
    return `- ${scenario.name}: \`${scenario.href}\``;
  }).join("\n");

  return `# Replay Link Contract

- Generated: ${report.generatedAt}
- Scenario count: ${report.scenarios.length}
- All scenarios valid: ${report.valid ? "yes" : "no"}

## Required Parameters

${params}

## Valid Values

- Maps: ${report.maps.join(", ")}
- Roles: ${report.roles.join(", ")}
- Durations: ${report.durations.join(", ")}
- Bot pressure: ${report.botPressure.join(", ")}
- Seed format: 8 uppercase hexadecimal characters

## Scenario URLs

${scenarios}
`;
}

const scenarios = makeScenarios();
const report = {
  generatedAt: new Date().toISOString(),
  valid: true,
  ...contract,
  seedPattern: contract.seedPattern.source,
  scenarios
};

await mkdir(replayRoot, { recursive: true });
await writeFile(replayJsonUrl, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(replayMarkdownUrl, makeMarkdown(report));

console.log(`Replay link check ok: ${scenarios.length} scenarios`);
