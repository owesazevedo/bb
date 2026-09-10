import {
  BB_DESKTOP_BROWSER_GRAB_CSS_KEYS,
  BB_DESKTOP_BROWSER_MAX_GRAB_CSS_VALUE_LENGTH,
  BB_DESKTOP_BROWSER_MAX_GRAB_HTML_LENGTH,
  BB_DESKTOP_BROWSER_MAX_GRAB_SELECTOR_LENGTH,
  BB_DESKTOP_BROWSER_MAX_TITLE_LENGTH,
  BB_DESKTOP_BROWSER_MAX_URL_LENGTH,
} from "@bb/desktop-contract";

export interface BrowserGrabGuestRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserGrabGuestSelection {
  tagName: string;
  selector: string;
  html: string;
  css: Record<string, string>;
  rect: BrowserGrabGuestRect;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readRect(value: unknown): BrowserGrabGuestRect | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    !isFiniteNumber(record.x) ||
    !isFiniteNumber(record.y) ||
    !isFiniteNumber(record.width) ||
    !isFiniteNumber(record.height) ||
    record.width < 0 ||
    record.height < 0
  ) {
    return null;
  }
  return {
    x: record.x,
    y: record.y,
    width: record.width,
    height: record.height,
  };
}

export function isBrowserGrabCancellationPayload(value: unknown): boolean {
  if (value === null || typeof value !== "object") {
    return false;
  }
  return (value as Record<string, unknown>).cancelled === true;
}

export function clampBrowserGrabGuestSelection(
  value: unknown,
): BrowserGrabGuestSelection | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.tagName !== "string" ||
    record.tagName.trim().length === 0
  ) {
    return null;
  }
  if (typeof record.selector !== "string" || typeof record.html !== "string") {
    return null;
  }
  const rect = readRect(record.rect);
  if (rect === null) {
    return null;
  }
  const css: Record<string, string> = {};
  if (record.css !== null && typeof record.css === "object") {
    const rawCss = record.css as Record<string, unknown>;
    for (const key of BB_DESKTOP_BROWSER_GRAB_CSS_KEYS) {
      const cssValue = rawCss[key];
      if (typeof cssValue === "string") {
        css[key] = truncate(
          cssValue,
          BB_DESKTOP_BROWSER_MAX_GRAB_CSS_VALUE_LENGTH,
        );
      }
    }
  }
  return {
    tagName: truncate(record.tagName.trim().toLowerCase(), 64),
    selector: truncate(
      record.selector,
      BB_DESKTOP_BROWSER_MAX_GRAB_SELECTOR_LENGTH,
    ),
    html: truncate(record.html, BB_DESKTOP_BROWSER_MAX_GRAB_HTML_LENGTH),
    css,
    rect,
  };
}

export function truncateBrowserGrabPageMeta(args: {
  title: string | null;
  url: string;
}): { title: string | null; url: string } {
  return {
    url: truncate(args.url, BB_DESKTOP_BROWSER_MAX_URL_LENGTH),
    title:
      args.title === null
        ? null
        : truncate(args.title, BB_DESKTOP_BROWSER_MAX_TITLE_LENGTH),
  };
}
