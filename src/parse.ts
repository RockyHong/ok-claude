export type LogEvent = {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
};

type RawContentBlock = { type?: string; text?: string };
type RawMessage = {
  role?: string;
  content?: string | RawContentBlock[];
};
type RawLine = {
  message?: RawMessage;
  timestamp?: string;
};

function extractText(content: string | RawContentBlock[] | undefined): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (block && block.type === "text" && typeof block.text === "string") {
      out += block.text;
    }
  }
  return out;
}

export function parseJsonl(content: string): LogEvent[] {
  const events: LogEvent[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let raw: RawLine;
    try {
      raw = JSON.parse(trimmed) as RawLine;
    } catch {
      continue;
    }

    const role = raw.message?.role;
    if (role !== "user" && role !== "assistant") continue;

    const text = extractText(raw.message?.content);
    if (!text) continue;

    const event: LogEvent = { role, text };
    if (typeof raw.timestamp === "string") event.timestamp = raw.timestamp;
    events.push(event);
  }
  return events;
}
