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
  isMeta?: boolean;
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

const HARNESS_TAGS = [
  "system-reminder",
  "command-name",
  "command-message",
  "command-args",
  "local-command-stdout",
  "local-command-stderr",
];
const HARNESS_TAG_RE = new RegExp(
  `<(${HARNESS_TAGS.join("|")})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  "g",
);

function stripHarnessTags(text: string): string {
  return text.replace(HARNESS_TAG_RE, "");
}

export function parseLine(line: string): LogEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let raw: RawLine;
  try {
    raw = JSON.parse(trimmed) as RawLine;
  } catch {
    return null;
  }

  if (raw.isMeta === true) return null;

  const role = raw.message?.role;
  if (role !== "user" && role !== "assistant") return null;

  const rawText = extractText(raw.message?.content);
  const text = stripHarnessTags(rawText);
  if (!text.trim()) return null;

  const event: LogEvent = { role, text };
  if (typeof raw.timestamp === "string") event.timestamp = raw.timestamp;
  return event;
}

export function parseJsonl(content: string): LogEvent[] {
  const events: LogEvent[] = [];
  for (const line of content.split("\n")) {
    const e = parseLine(line);
    if (e) events.push(e);
  }
  return events;
}
