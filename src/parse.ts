export type LogEvent = {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
  tokensIn?: number;
  tokensOut?: number;
};

type RawContentBlock = { type?: string; text?: string };
type RawMessage = {
  role?: string;
  content?: string | RawContentBlock[];
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
};
type RawLine = {
  type?: string;
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  isVisibleInTranscriptOnly?: boolean;
};

const PROSE_TYPES = new Set(["user", "assistant"]);

type DropReason =
  | "non-prose-type"
  | "isMeta"
  | "isSidechain"
  | "isApiErrorMessage"
  | "isCompactSummary"
  | "isVisibleInTranscriptOnly"
  | "non-prose-role"
  | "empty-text";

function dropReason(raw: RawLine): DropReason | null {
  if (raw.type !== undefined && !PROSE_TYPES.has(raw.type)) return "non-prose-type";
  if (raw.isMeta === true) return "isMeta";
  if (raw.isSidechain === true) return "isSidechain";
  if (raw.isApiErrorMessage === true) return "isApiErrorMessage";
  if (raw.isCompactSummary === true) return "isCompactSummary";
  if (raw.isVisibleInTranscriptOnly === true) return "isVisibleInTranscriptOnly";
  const role = raw.message?.role;
  if (role !== "user" && role !== "assistant") return "non-prose-role";
  return null;
}

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

// Synthetic user message injected by Claude Code when user presses ESC during
// tool use. Surfaces as a `user`-role `text` block — no flag distinguishes it
// from typed prose. Two known forms; whole-message exact match.
const SYNTHETIC_USER_INTERRUPT =
  /^\[Request interrupted by user(?: for tool use)?\]$/;

const HARNESS_TAGS = [
  "system-reminder",
  "command-name",
  "command-message",
  "command-args",
  "local-command-stdout",
  "local-command-stderr",
  "task-notification",
  "bash-input",
  "bash-stdout",
  "bash-stderr",
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

  if (dropReason(raw) !== null) return null;

  const role = raw.message!.role as "user" | "assistant";
  const rawText = extractText(raw.message?.content);
  const text = stripHarnessTags(rawText);
  const stripped = text.trim();
  if (!stripped) return null;
  if (role === "user" && SYNTHETIC_USER_INTERRUPT.test(stripped)) return null;

  const event: LogEvent = { role, text };
  if (typeof raw.timestamp === "string") event.timestamp = raw.timestamp;

  const usage = raw.message?.usage;
  if (usage && typeof usage.input_tokens === "number") {
    event.tokensIn = usage.input_tokens;
  }
  if (usage && typeof usage.output_tokens === "number") {
    event.tokensOut = usage.output_tokens;
  }
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
