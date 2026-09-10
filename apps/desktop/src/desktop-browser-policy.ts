import { isPrivilegedFilePreviewUrl } from "@bb/config/file-preview-origin";

export function isAllowedBrowserUrl(url: string): boolean {
  if (url === "about:blank") return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    return true;
  }
  if (parsed.protocol === "file:") {
    return parsed.hostname === "" && parsed.pathname.length > 1;
  }
  return isPrivilegedFilePreviewUrl(url);
}

interface PopupRateDecision {
  allowed: boolean;
  timestamps: number[];
}

interface EvaluatePopupRateArgs {
  timestamps: readonly number[];
  now: number;
  windowMs: number;
  maxInWindow: number;
}

export function evaluatePopupRate({
  timestamps,
  now,
  windowMs,
  maxInWindow,
}: EvaluatePopupRateArgs): PopupRateDecision {
  const recent = timestamps.filter((stamp) => now - stamp < windowMs);
  if (recent.length >= maxInWindow) {
    return { allowed: false, timestamps: recent };
  }
  return { allowed: true, timestamps: [...recent, now] };
}
