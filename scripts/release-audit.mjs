import { readFile, stat } from "node:fs/promises";

const distRoot = new URL("../dist/web/", import.meta.url);
const runtimeFiles = ["index.html", "styles.css", "src/game.js", "src/platform.js"];
const publicCopyExtensions = [".html", ".css", ".js", ".json", ".md"];
const blockedPublicCopyTerms = [
  /\bmario\b/i,
  /\bluigi\b/i,
  /\bnintendo\b/i,
  /\bwii\b/i,
  /\bghost\s+mansion\b/i
];
const externalReferencePattern = /\b(?:https?:)?\/\/(?!127\.0\.0\.1|localhost)/i;

async function readDist(path) {
  return readFile(new URL(path, distRoot), "utf8");
}

async function assertDistFile(path) {
  const info = await stat(new URL(path, distRoot));
  if (!info.isFile()) {
    throw new Error(`Missing packaged file: ${path}`);
  }
}

function assertNoBlockedTerms(path, text) {
  const found = blockedPublicCopyTerms
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replaceAll("\\b", "").replace("\\s+", " "));
  if (found.length) {
    throw new Error(`Blocked public-copy term(s) in ${path}: ${found.join(", ")}`);
  }
}

function assertNoExternalReferences(path, text) {
  const match = text.match(externalReferencePattern);
  if (match) {
    throw new Error(`External runtime reference in ${path}: ${match[0]}`);
  }
}

const manifest = JSON.parse(await readDist("build-manifest.json"));
if (manifest.entry !== "index.html") {
  throw new Error(`Unexpected entry in build manifest: ${manifest.entry}`);
}
if (manifest.steamReadiness?.thirdPartyRuntimeDependencies !== 0) {
  throw new Error("Build manifest must declare zero third-party runtime dependencies.");
}

for (const file of manifest.files) {
  await assertDistFile(file);
}

for (const file of manifest.files) {
  if (!publicCopyExtensions.some((extension) => file.endsWith(extension))) {
    continue;
  }
  const text = await readDist(file);
  assertNoBlockedTerms(file, text);
}

for (const file of runtimeFiles) {
  const text = await readDist(file);
  assertNoExternalReferences(file, text);
}

const html = await readDist("index.html");
for (const expected of ["styles.css", "src/game.js"]) {
  if (!html.includes(expected)) {
    throw new Error(`index.html does not reference ${expected}`);
  }
}

console.log(`Release audit ok: ${manifest.files.length} files, ${runtimeFiles.length} runtime files checked`);
