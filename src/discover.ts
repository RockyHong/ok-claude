import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export function logsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

export async function discoverLogs(): Promise<string[]> {
  const root = logsRoot();
  try {
    const entries = await readdir(root, {
      recursive: true,
      withFileTypes: true,
    });
    const out: string[] = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".jsonl")) continue;
      out.push(join(e.parentPath, e.name));
    }
    out.sort();
    return out;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}
