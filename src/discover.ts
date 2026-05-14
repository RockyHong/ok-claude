import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, sep } from "node:path";

export type LogFile = { path: string; size: number };

export function logsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

// Claude Code nests subagent dispatch transcripts under
//   <project>/<session-uuid>/subagents/agent-*.jsonl
// Those are LLM-to-LLM prompts, not human typing — exclude from wordcloud.
const SUBAGENT_SEG = `${sep}subagents${sep}`;

export async function discoverLogs(): Promise<LogFile[]> {
  const root = logsRoot();
  const paths: string[] = [];
  try {
    const entries = await readdir(root, {
      recursive: true,
      withFileTypes: true,
    });
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".jsonl")) continue;
      const full = join(e.parentPath, e.name);
      if (full.includes(SUBAGENT_SEG)) continue;
      paths.push(full);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  paths.sort();

  const out: LogFile[] = [];
  for (const p of paths) {
    try {
      const s = await stat(p);
      out.push({ path: p, size: s.size });
    } catch {
      // file vanished between readdir and stat — skip
    }
  }
  return out;
}
