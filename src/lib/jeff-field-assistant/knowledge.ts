import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type KnowledgeRoot = {
  label: string;
  rootPath: string;
  canonical: boolean;
};

export type WrenchReadyKnowledgeMatch = {
  title: string;
  sourcePath: string;
  sourceLabel: string;
  canonical: boolean;
  score: number;
  excerpt: string;
};

const MAX_FILES_PER_ROOT = 220;
const MAX_FILE_BYTES = 160_000;
const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "could",
  "from",
  "have",
  "into",
  "just",
  "need",
  "needs",
  "that",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "you",
]);

function repoRoot() {
  return process.cwd();
}

function knowledgeRoots(): KnowledgeRoot[] {
  const root = repoRoot();

  return [
    {
      label: "WrenchReady repo docs",
      rootPath: path.join(root, "docs"),
      canonical: true,
    },
    {
      label: "WrenchReady Assistant archive",
      rootPath: path.resolve(root, "..", "WrenchReady Assistant"),
      canonical: false,
    },
  ];
}

function relativeSource(filePath: string) {
  const root = path.resolve(repoRoot(), "..");
  return path.relative(root, filePath).replaceAll(path.sep, "/");
}

function isSkippableDirectory(name: string) {
  return name.startsWith(".") ||
    name === "node_modules" ||
    name === ".next" ||
    name === "dist" ||
    name === "build";
}

function collectMarkdownFiles(rootPath: string) {
  const files: string[] = [];

  function visit(directory: string) {
    if (files.length >= MAX_FILES_PER_ROOT) return;

    let entries: string[];
    try {
      entries = readdirSync(directory);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES_PER_ROOT) return;
      const fullPath = path.join(directory, entry);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        if (!isSkippableDirectory(entry)) visit(fullPath);
        continue;
      }

      if (stats.isFile() && entry.toLowerCase().endsWith(".md") && stats.size <= MAX_FILE_BYTES) {
        files.push(fullPath);
      }
    }
  }

  if (existsSync(rootPath)) visit(rootPath);
  return files;
}

function queryTerms(query: string) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[^a-z0-9$.'-]+/g, " ")
        .split(/\s+/)
        .map((term) => term.replace(/^['.-]+|['.-]+$/g, ""))
        .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    ),
  ].slice(0, 14);
}

function titleFromMarkdown(filePath: string, content: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return path.basename(filePath, ".md").replace(/[-_]+/g, " ");
}

function scoreFile(input: {
  query: string;
  terms: string[];
  filePath: string;
  content: string;
  canonical: boolean;
}) {
  const lowerContent = input.content.toLowerCase();
  const lowerPath = relativeSource(input.filePath).toLowerCase();
  const lowerTitle = titleFromMarkdown(input.filePath, input.content).toLowerCase();
  const normalizedQuery = input.query.toLowerCase().trim();

  let score = input.canonical ? 4 : 1;
  if (normalizedQuery.length > 8 && lowerContent.includes(normalizedQuery)) score += 30;

  for (const term of input.terms) {
    if (lowerTitle.includes(term)) score += 12;
    if (lowerPath.includes(term)) score += 8;
    const count = lowerContent.split(term).length - 1;
    if (count > 0) score += Math.min(12, count * 2);
  }

  return score;
}

function excerptFor(content: string, terms: string[]) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const lower = compact.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = Math.max(0, (firstHit ?? 0) - 180);
  const end = Math.min(compact.length, start + 520);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < compact.length ? "..." : "";
  return `${prefix}${compact.slice(start, end)}${suffix}`;
}

export function searchWrenchReadyKnowledgeFiles(input: {
  query: string;
  limit?: number;
}) {
  const query = input.query.trim();
  const terms = queryTerms(query);
  const limit = Math.max(1, Math.min(input.limit || 5, 8));
  const warnings: string[] = [];
  const searchedRoots: Array<{ label: string; available: boolean; canonical: boolean; path: string }> = [];
  const matches: WrenchReadyKnowledgeMatch[] = [];

  for (const root of knowledgeRoots()) {
    const available = existsSync(root.rootPath);
    searchedRoots.push({
      label: root.label,
      available,
      canonical: root.canonical,
      path: relativeSource(root.rootPath),
    });
    if (!available) {
      warnings.push(`${root.label} is not available in this runtime.`);
      continue;
    }

    for (const filePath of collectMarkdownFiles(root.rootPath)) {
      let content = "";
      try {
        content = readFileSync(filePath, "utf8");
      } catch {
        continue;
      }

      const score = scoreFile({
        query,
        terms,
        filePath,
        content,
        canonical: root.canonical,
      });
      if (score <= (root.canonical ? 5 : 2)) continue;

      matches.push({
        title: titleFromMarkdown(filePath, content),
        sourcePath: relativeSource(filePath),
        sourceLabel: root.label,
        canonical: root.canonical,
        score,
        excerpt: excerptFor(content, terms),
      });
    }
  }

  return {
    query,
    terms,
    searchedRoots,
    matches: matches
      .sort((a, b) => b.score - a.score || Number(b.canonical) - Number(a.canonical))
      .slice(0, limit),
    warnings,
  };
}
