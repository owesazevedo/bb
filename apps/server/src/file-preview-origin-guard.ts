import {
  hostnameFromHostHeader,
  isFilePreviewHostname,
  isFilePreviewOriginApiRequest,
  SANDBOXED_HTML_PREVIEW_CSP,
} from "@bb/config/file-preview-origin";
import type { BrowserRequestProblem } from "./browser-request-guard.js";

interface FilePreviewOriginRequestContext {
  req: {
    url: string;
    method: string;
    header(name: string): string | undefined;
  };
}

function previewApiPathname(pathname: string): string {
  if (pathname.startsWith("/api/v1/")) {
    return pathname;
  }
  return `/api/v1${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function requestHostname(
  context: FilePreviewOriginRequestContext,
): string | null {
  const fromHeader = hostnameFromHostHeader(context.req.header("host"));
  if (fromHeader !== null) {
    return fromHeader;
  }
  try {
    return hostnameFromHostHeader(new URL(context.req.url).host);
  } catch {
    return null;
  }
}

export function htmlPreviewCspForRequest(
  context: FilePreviewOriginRequestContext,
): string | null {
  const hostname = requestHostname(context);
  if (hostname !== null && isFilePreviewHostname(hostname)) {
    return null;
  }
  return SANDBOXED_HTML_PREVIEW_CSP;
}

export function filePreviewOriginApiProblem(
  context: FilePreviewOriginRequestContext,
): BrowserRequestProblem | null {
  const hostname = requestHostname(context);
  if (hostname === null || !isFilePreviewHostname(hostname)) {
    return null;
  }

  const pathname = previewApiPathname(new URL(context.req.url).pathname);
  if (isFilePreviewOriginApiRequest(context.req.method, pathname)) {
    return null;
  }

  return {
    status: 403,
    error: "preview origin cannot access this API",
  };
}
