import type { BbDesktopBrowserGrabResult } from "@bb/desktop-contract";
import { PERSONAL_PROJECT_ID } from "@bb/domain";
import { type PromptDraftState } from "@bb/client-core";

const CHIP_LOCATION_MAX_LENGTH = 48;
const HIDDEN_PAYLOAD_OPEN = "<!-- bb-browser-grab";
const HIDDEN_PAYLOAD_CLOSE = "-->";
const HIDDEN_PAYLOAD_PATTERN =
  /(?:^|\n)?<!-- bb-browser-grab\n[\s\S]*?\n-->\n?/g;
const CHIP_TOKEN_PATTERN = /@el:([A-Za-z][\w:-]*)/g;
const LEGACY_CHIP_LINE_PATTERN = /^(?:> )?Browser · .+$/;

export type BrowserGrabDraftTarget =
  | { kind: "new-thread" }
  | { kind: "thread"; projectId: string; threadId: string };

export type BrowserGrabSelectedResult = Extract<
  BbDesktopBrowserGrabResult,
  { kind: "selected" }
>;

export type PromptGrabPayloadNodeName =
  | "browserGrabPayload"
  | "markdownGrabPayload";

export interface BrowserGrabChipRegion {
  start: number;
  end: number;
  tagName: string;
  token: string;
  payload: string;
  title: string;
  nodeName?: PromptGrabPayloadNodeName;
}

export function isBbThreadId(value: string | undefined): value is string {
  return typeof value === "string" && value.startsWith("thr_");
}

export function resolveBrowserGrabDraftTarget(args: {
  panelThreadId: string;
  routeProjectId: string | undefined;
  routeThreadId: string | undefined;
}): BrowserGrabDraftTarget {
  const threadId = isBbThreadId(args.panelThreadId)
    ? args.panelThreadId
    : isBbThreadId(args.routeThreadId)
      ? args.routeThreadId
      : undefined;
  if (threadId !== undefined) {
    return {
      kind: "thread",
      projectId: args.routeProjectId ?? PERSONAL_PROJECT_ID,
      threadId,
    };
  }
  return { kind: "new-thread" };
}

function truncateChip(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

export function formatBrowserGrabLocation(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return truncateChip(`${parsed.host}${path}`, CHIP_LOCATION_MAX_LENGTH);
  } catch {
    return truncateChip(url, CHIP_LOCATION_MAX_LENGTH);
  }
}

export function normalizeBrowserGrabTagName(tagName: string): string {
  const match = tagName.trim().toLowerCase().match(/^[a-z][\w:-]*/);
  return match?.[0] ?? "element";
}

export function formatBrowserGrabChipToken(tagName: string): string {
  return `@el:${normalizeBrowserGrabTagName(tagName)}`;
}

export function formatBrowserGrabChipTitle(
  result: Pick<BrowserGrabSelectedResult, "selector" | "url">,
): string {
  const selector = result.selector.trim();
  const location = formatBrowserGrabLocation(result.url);
  if (selector.length > 0 && location.length > 0) {
    return `${selector} · ${location}`;
  }
  return selector || location;
}

export function formatBrowserGrabChip(result: BrowserGrabSelectedResult): string {
  return formatBrowserGrabChipToken(result.tagName);
}

function sanitizeHtmlCommentBody(value: string): string {
  return value.replaceAll("--", "—");
}

export function formatBrowserGrabHiddenPayload(
  result: BrowserGrabSelectedResult,
): string {
  const cssLines = Object.entries(result.css)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const titleLine =
    result.title !== null && result.title.length > 0
      ? `\nTitle: ${result.title}`
      : "";
  const html = result.html.trim();
  const body = sanitizeHtmlCommentBody(
    [
      `URL: ${result.url}${titleLine}`,
      `Tag: ${result.tagName}`,
      `Selector: ${result.selector}`,
      html.length > 0 ? `HTML:\n${html}` : null,
      cssLines.length > 0 ? `CSS:\n${cssLines}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
  );
  return `\n${HIDDEN_PAYLOAD_OPEN}\n${body}\n${HIDDEN_PAYLOAD_CLOSE}\n`;
}

function payloadField(payload: string, name: string): string {
  const match = payload.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function titleFromPayload(payload: string): string {
  const url = payloadField(payload, "URL");
  const selector = payloadField(payload, "Selector");
  return formatBrowserGrabChipTitle({
    selector,
    url,
  });
}

function tagNameFromPayload(payload: string): string {
  return normalizeBrowserGrabTagName(payloadField(payload, "Tag") || "element");
}

function findCommentRegions(
  text: string,
): Array<{ start: number; end: number; payload: string }> {
  const regions: Array<{ start: number; end: number; payload: string }> = [];
  const pattern = /<!-- bb-browser-grab\n[\s\S]*?\n-->/g;
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }
    regions.push({
      start: match.index,
      end: match.index + match[0].length,
      payload: match[0],
    });
  }
  return regions;
}

export function isLegacyBrowserGrabChipLine(line: string): boolean {
  return LEGACY_CHIP_LINE_PATTERN.test(line);
}

function consumeTrailingNewline(text: string, end: number): number {
  return text[end] === "\n" ? end + 1 : end;
}

function expandLegacyChipPrefix(text: string, commentStart: number): number {
  let cursor = commentStart;
  while (cursor > 0 && text[cursor - 1] === "\n") {
    const previousLineStart = text.lastIndexOf("\n", cursor - 2) + 1;
    const previousLine = text.slice(previousLineStart, cursor - 1);
    if (LEGACY_CHIP_LINE_PATTERN.test(previousLine)) {
      return previousLineStart;
    }
    if (previousLine.length === 0) {
      cursor = previousLineStart;
      continue;
    }
    break;
  }
  return commentStart;
}

function regionsOverlap(
  left: { start: number; end: number },
  right: { start: number; end: number },
): boolean {
  return left.start < right.end && right.start < left.end;
}

export function findBrowserGrabChipRegions(
  text: string,
): BrowserGrabChipRegion[] {
  const comments = findCommentRegions(text);
  const usedComments = new Set<number>();
  const regions: BrowserGrabChipRegion[] = [];

  for (const match of text.matchAll(CHIP_TOKEN_PATTERN)) {
    if (match.index === undefined) {
      continue;
    }
    const token = match[0];
    const tagName = normalizeBrowserGrabTagName(match[1] ?? "element");
    const tokenEnd = match.index + token.length;
    const following = comments.find((comment) => {
      if (comment.start < tokenEnd) {
        return false;
      }
      const between = text.slice(tokenEnd, comment.start);
      return between === "" || between === "\n";
    });
    let end = tokenEnd;
    let payload = "";
    let title = "";
    if (following) {
      usedComments.add(following.start);
      payload = following.payload;
      end = consumeTrailingNewline(text, following.end);
      title = titleFromPayload(payload);
    }
    regions.push({
      start: match.index,
      end,
      tagName,
      token,
      payload,
      title,
    });
  }

  for (const comment of comments) {
    if (usedComments.has(comment.start)) {
      continue;
    }
    const start = expandLegacyChipPrefix(text, comment.start);
    const tagName = tagNameFromPayload(comment.payload);
    const candidate: BrowserGrabChipRegion = {
      start,
      end: consumeTrailingNewline(text, comment.end),
      tagName,
      token: formatBrowserGrabChipToken(tagName),
      payload: comment.payload,
      title: titleFromPayload(comment.payload),
    };
    if (regions.some((region) => regionsOverlap(region, candidate))) {
      continue;
    }
    regions.push(candidate);
  }

  return regions.sort((left, right) => left.start - right.start);
}

export function replaceBrowserGrabRegionsWithChipTokens(text: string): string {
  const regions = findBrowserGrabChipRegions(text);
  if (regions.length === 0) {
    return text.replace(HIDDEN_PAYLOAD_PATTERN, "\n");
  }
  let next = text;
  for (const region of [...regions].reverse()) {
    next = `${next.slice(0, region.start)}${region.token}${next.slice(region.end)}`;
  }
  return next
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trimEnd();
}

export function stripBrowserGrabHiddenPayload(text: string): string {
  return replaceBrowserGrabRegionsWithChipTokens(text);
}

export function readBrowserGrabHiddenPayloadFromLines(
  lines: readonly string[],
  startIndex: number,
): { nextIndex: number; payload: string } | null {
  if (lines[startIndex]?.trim() !== HIDDEN_PAYLOAD_OPEN) {
    return null;
  }
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index]!.trim() !== HIDDEN_PAYLOAD_CLOSE) {
      continue;
    }
    let nextIndex = index + 1;
    if (nextIndex < lines.length && lines[nextIndex] === "") {
      nextIndex += 1;
    }
    return {
      nextIndex,
      payload: lines.slice(startIndex, index + 1).join("\n"),
    };
  }
  return null;
}

export function serializeBrowserGrabChip(attrs: {
  tagName?: string;
  payload?: string;
}): string {
  const token = formatBrowserGrabChipToken(attrs.tagName ?? "element");
  const payload = attrs.payload ?? "";
  if (payload.length === 0) {
    return token;
  }
  const prefixed = payload.startsWith("\n") ? payload : `\n${payload}`;
  return `${token}${prefixed.endsWith("\n") ? prefixed : `${prefixed}\n`}`;
}

export function formatBrowserGrabQuote(result: BrowserGrabSelectedResult): string {
  return `${formatBrowserGrabChip(result)}${formatBrowserGrabHiddenPayload(result)}`;
}

export function appendBrowserGrabToDraft(
  state: PromptDraftState,
  result: BrowserGrabSelectedResult,
): PromptDraftState {
  const chunk = formatBrowserGrabQuote(result);
  const needsSpace =
    state.text.length > 0 && !/[\s\n]$/.test(state.text);
  return {
    ...state,
    text: `${state.text}${needsSpace ? " " : ""}${chunk}`,
  };
}
