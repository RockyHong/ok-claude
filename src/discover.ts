import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type LogFile = { path: string; size: number };

export function logsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

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
      paths.push(join(e.parentPath, e.name));
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
