import type { PromptDraftState } from "@bb/client-core";
import {
  type BrowserGrabChipRegion,
  findBrowserGrabChipRegions,
} from "@/lib/browser-grab-quote";

const CHIP_LOCATION_MAX_LENGTH = 48;
const HIDDEN_PAYLOAD_OPEN = "<!-- bb-markdown-grab";
const HIDDEN_PAYLOAD_CLOSE = "-->";
const HIDDEN_PAYLOAD_PATTERN =
  /(?:^|\n)?<!-- bb-markdown-grab\n[\s\S]*?\n-->\n?/g;
const CHIP_TOKEN_PATTERN = /@md:([A-Za-z][\w.-]*)/g;

export interface MarkdownGrabSelectedResult {
  path: string;
  fileName: string;
  text: string;
  contents: string;
}

export const MARKDOWN_GRAB_PAYLOAD_NODE_NAME = "markdownGrabPayload";

function truncateChip(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1)}…`;
}

function sanitizeHtmlCommentBody(value: string): string {
  return value.replaceAll("--", "—");
}

export function formatMarkdownGrabSlug(fileName: string): string {
  const base = fileName.replace(/\.(mdx?|markdown)$/iu, "");
  let slug = base.replace(/[^A-Za-z0-9.-]+/gu, "-").replace(/^-+|-+$/gu, "");
  if (!/^[A-Za-z]/u.test(slug)) {
    slug = `n${slug}`;
  }
  const match = slug.match(/^[A-Za-z][\w.-]*/u);
  return match?.[0] ?? "note";
}

export function formatMarkdownGrabChipToken(fileName: string): string {
  return `@md:${formatMarkdownGrabSlug(fileName)}`;
}

export function markdownGrabLineRange(
  contents: string,
  snippet: string,
): { start: number; end: number } | null {
  const index = contents.indexOf(snippet);
  if (index < 0) {
    return null;
  }
  const start = contents.slice(0, index).split("\n").length;
  const end = contents.slice(0, index + snippet.length).split("\n").length;
  return { start, end };
}

export function formatMarkdownGrabChipTitle(
  result: Pick<MarkdownGrabSelectedResult, "path"> & {
    lineStart?: number;
    lineEnd?: number;
  },
): string {
  const location = truncateChip(result.path, CHIP_LOCATION_MAX_LENGTH);
  if (
    result.lineStart !== undefined &&
    result.lineEnd !== undefined &&
    result.lineStart > 0
  ) {
    const range =
      result.lineStart === result.lineEnd
        ? `L${result.lineStart}`
        : `L${result.lineStart}–${result.lineEnd}`;
    return `${location} · ${range}`;
  }
  return location;
}

export function formatMarkdownGrabHiddenPayload(
  result: MarkdownGrabSelectedResult,
): string {
  const snippet = result.text.trim();
  const range = markdownGrabLineRange(result.contents, snippet);
  const lines =
    range === null
      ? null
      : range.start === range.end
        ? `Lines: ${range.start}`
        : `Lines: ${range.start}-${range.end}`;
  const body = sanitizeHtmlCommentBody(
    [
      `Path: ${result.path}`,
      `File: ${result.fileName}`,
      lines,
      snippet.length > 0 ? `Text:\n${snippet}` : null,
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

function fileNameFromPayload(payload: string): string {
  return payloadField(payload, "File") || "note.md";
}

function titleFromPayload(payload: string): string {
  const path = payloadField(payload, "Path");
  const lines = payloadField(payload, "Lines");
  const match = lines.match(/^(\d+)(?:-(\d+))?$/);
  return formatMarkdownGrabChipTitle({
    path,
    lineStart: match ? Number(match[1]) : undefined,
    lineEnd: match ? Number(match[2] ?? match[1]) : undefined,
  });
}

function consumeTrailingNewline(text: string, index: number): number {
  return text[index] === "\n" ? index + 1 : index;
}

function findCommentRegions(
  text: string,
): Array<{ start: number; end: number; payload: string }> {
  const regions: Array<{ start: number; end: number; payload: string }> = [];
  const pattern = /<!-- bb-markdown-grab\n[\s\S]*?\n-->/g;
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

function regionsOverlap(
  left: BrowserGrabChipRegion,
  right: BrowserGrabChipRegion,
): boolean {
  return left.start < right.end && right.start < left.end;
}

export function findMarkdownGrabChipRegions(
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
    const tagName = formatMarkdownGrabSlug(match[1] ?? "note");
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
      nodeName: MARKDOWN_GRAB_PAYLOAD_NODE_NAME,
    });
  }

  for (const comment of comments) {
    if (usedComments.has(comment.start)) {
      continue;
    }
    const fileName = fileNameFromPayload(comment.payload);
    const tagName = formatMarkdownGrabSlug(fileName);
    const candidate: BrowserGrabChipRegion = {
      start: comment.start,
      end: consumeTrailingNewline(text, comment.end),
      tagName,
      token: formatMarkdownGrabChipToken(fileName),
      payload: comment.payload,
      title: titleFromPayload(comment.payload),
      nodeName: MARKDOWN_GRAB_PAYLOAD_NODE_NAME,
    };
    if (regions.some((region) => regionsOverlap(region, candidate))) {
      continue;
    }
    regions.push(candidate);
  }

  return regions.sort((left, right) => left.start - right.start);
}

export function findPromptGrabChipRegions(text: string): BrowserGrabChipRegion[] {
  return [...findBrowserGrabChipRegions(text), ...findMarkdownGrabChipRegions(text)].sort(
    (left, right) => left.start - right.start,
  );
}

export function isMarkdownGrabChipRegion(grab: BrowserGrabChipRegion): boolean {
  return (
    grab.nodeName === MARKDOWN_GRAB_PAYLOAD_NODE_NAME ||
    grab.token.startsWith("@md:")
  );
}

export function serializeMarkdownGrabChip(attrs: {
  tagName?: string;
  payload?: string;
}): string {
  const token = formatMarkdownGrabChipToken(
    `${attrs.tagName ?? "note"}.md`,
  );
  const payload = attrs.payload ?? "";
  if (payload.length === 0) {
    return token;
  }
  const prefixed = payload.startsWith("\n") ? payload : `\n${payload}`;
  return `${token}${prefixed.endsWith("\n") ? prefixed : `${prefixed}\n`}`;
}

export function formatMarkdownGrabQuote(
  result: MarkdownGrabSelectedResult,
): string {
  return `${formatMarkdownGrabChipToken(result.fileName)}${formatMarkdownGrabHiddenPayload(result)}`;
}

export function appendMarkdownGrabToDraft(
  state: PromptDraftState,
  result: MarkdownGrabSelectedResult,
): PromptDraftState {
  const snippet = result.text.trim();
  if (snippet.length === 0) {
    return state;
  }
  const chunk = formatMarkdownGrabQuote({ ...result, text: snippet });
  const needsSpace = state.text.length > 0 && !/[\s\n]$/.test(state.text);
  return {
    ...state,
    text: `${state.text}${needsSpace ? " " : ""}${chunk}`,
  };
}

export function applyMarkdownGrabToDraftAccessor(
  accessor: {
    getCurrent: () => PromptDraftState;
    setDraft: (draft: PromptDraftState) => void;
  },
  result: MarkdownGrabSelectedResult,
): boolean {
  const current = accessor.getCurrent();
  const next = appendMarkdownGrabToDraft(current, result);
  if (next.text === current.text) {
    return false;
  }
  accessor.setDraft(next);
  return true;
}

export function stripMarkdownGrabHiddenPayload(text: string): string {
  const regions = findMarkdownGrabChipRegions(text);
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
