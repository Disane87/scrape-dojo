import fs from 'node:fs';
import path from 'node:path';

export interface ChangelogSection {
  emoji: string;
  title: string;
  items: { text: string; url?: string }[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  compareUrl?: string;
  sections: ChangelogSection[];
}

const sectionMap: Record<string, { emoji: string; title: string }> = {
  features: { emoji: '🚀', title: 'Features' },
  fixes: { emoji: '🛠️', title: 'Fixes' },
  'bug fixes': { emoji: '🛠️', title: 'Fixes' },
  performance: { emoji: '⚡', title: 'Performance' },
  reverts: { emoji: '🔙', title: 'Reverts' },
  docs: { emoji: '📔', title: 'Docs' },
  styles: { emoji: '💎', title: 'Styles' },
  refactor: { emoji: '♻️', title: 'Refactor' },
  tests: { emoji: '🧪', title: 'Tests' },
  build: { emoji: '📦', title: 'Build' },
  ci: { emoji: '🤖', title: 'CI' },
  chore: { emoji: '🔧', title: 'Chore' },
  'breaking changes': { emoji: '⚠️', title: 'Breaking Changes' },
};

function extractSections(versionBlock: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  const headingRegex = /^### (?:[^\w]*\s*)?(.+)$/gm;
  const headingMatches: { title: string; index: number }[] = [];
  let hm;
  while ((hm = headingRegex.exec(versionBlock)) !== null) {
    headingMatches.push({ title: hm[1].trim(), index: hm.index });
  }

  for (let j = 0; j < headingMatches.length; j++) {
    const start = headingMatches[j].index;
    const end =
      j + 1 < headingMatches.length
        ? headingMatches[j + 1].index
        : versionBlock.length;
    const block = versionBlock.substring(start, end);

    const items = block
      .split('\n')
      .filter(
        (line: string) =>
          line.trim().startsWith('*') || line.trim().startsWith('-'),
      )
      .map((line: string) => {
        const cleaned = line
          .trim()
          .replace(/^[-*]\s*/, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\([a-f0-9]{7}\)/g, '')
          .replace(/\[([a-f0-9]{7,})\]\([^)]+\)/g, '')
          .replace(/,?\s*closes?\s*\[#\d+\]\([^)]+\)/gi, '')
          .trim();
        const issueMatch = line.match(/\[#(\d+)\]\(([^)]+)\)/);
        return {
          text: cleaned,
          url: issueMatch ? issueMatch[2] : undefined,
        };
      })
      .filter((item) => item.text.length > 0);

    if (items.length === 0) continue;

    const rawTitle = headingMatches[j].title;
    const titleNoEmoji = rawTitle.replace(/^[^\w]*/u, '').trim();
    const key = titleNoEmoji.toLowerCase();
    const mapped = sectionMap[key];

    sections.push({
      emoji: mapped?.emoji || '📋',
      title: mapped?.title || titleNoEmoji,
      items,
    });
  }
  return sections;
}

export function readChangelog(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'CHANGELOG.md'),
    path.resolve(process.cwd(), '..', '..', 'CHANGELOG.md'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf-8');
    }
  }
  return '';
}

export function parseChangelog(md?: string): ChangelogEntry[] {
  const content = md ?? readChangelog();
  if (!content) return [];

  const entries: ChangelogEntry[] = [];
  const versionRegex =
    /^## \[?(\d+\.\d+\.\d+)\]?(?:\(([^)]*)\))?\s*\((\d{4}-\d{2}-\d{2})\)/gm;

  const matches: {
    version: string;
    compareUrl?: string;
    date: string;
    index: number;
  }[] = [];
  let match;
  while ((match = versionRegex.exec(content)) !== null) {
    matches.push({
      version: match[1],
      compareUrl: match[2] || undefined,
      date: match[3],
      index: match.index,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const block = content.substring(start, end);

    const sections = extractSections(block);
    if (sections.length > 0) {
      entries.push({
        version: matches[i].version,
        date: matches[i].date,
        compareUrl: matches[i].compareUrl,
        sections,
      });
    }
  }
  return entries;
}

export function changelogToHeadings(entries: ChangelogEntry[]) {
  return entries.map((entry) => ({
    depth: 2,
    slug: `v${entry.version}`,
    text: `v${entry.version} (${entry.date})`,
  }));
}
