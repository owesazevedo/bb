export const FILE_PREVIEW_HOSTNAME = "preview.localhost";
export const FILE_PREVIEW_SCHEME = "bb-preview";
export const FILE_PREVIEW_PROTOCOL = `${FILE_PREVIEW_SCHEME}:`;
export const SANDBOXED_HTML_PREVIEW_CSP = "sandbox allow-scripts";

export interface RewriteFilePreviewOriginOptions {
  privilegedScheme?: boolean;
}

const FILE_PREVIEW_PATH_PATTERNS = [
  /^\/api\/v1\/file-previews\//u,
  /^\/api\/v1\/threads\/[^/]+\/files\/raw$/u,
  /^\/api\/v1\/threads\/[^/]+\/worktree\/files\//u,
  /^\/api\/v1\/threads\/[^/]+\/thread-storage\/files\//u,
];

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/u, "").replace(/^\[|\]$/gu, "");
}

export function isFilePreviewHostname(hostname: string): boolean {
  return normalizeHostname(hostname) === FILE_PREVIEW_HOSTNAME;
}

export function hostnameFromHostHeader(
  hostHeader: string | undefined,
): string | null {
  if (hostHeader === undefined || hostHeader.length === 0) {
    return null;
  }
  try {
    return normalizeHostname(new URL(`http://${hostHeader}`).hostname);
  } catch {
    return null;
  }
}

export function isFilePreviewContentPath(pathname: string): boolean {
  return FILE_PREVIEW_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isFilePreviewOriginApiRequest(
  method: string,
  pathname: string,
): boolean {
  const upper = method.toUpperCase();
  if (upper !== "GET" && upper !== "HEAD") {
    return false;
  }
  return isFilePreviewContentPath(pathname);
}

function isIpv4LoopbackHostname(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts[0] !== "127") {
    return false;
  }
  return parts.every((part) => {
    if (!/^\d+$/u.test(part)) {
      return false;
    }
    const octet = Number(part);
    return octet >= 0 && octet <= 255 && String(octet) === part;
  });
}

export function isLoopbackPreviewSourceHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    isIpv4LoopbackHostname(host)
  );
}

export function htmlPreviewCspForRequestHost(
  hostHeader: string | undefined,
): string | null {
  const hostname = hostnameFromHostHeader(hostHeader);
  if (hostname !== null && isFilePreviewHostname(hostname)) {
    return null;
  }
  return SANDBOXED_HTML_PREVIEW_CSP;
}

export function isPrivilegedFilePreviewUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === FILE_PREVIEW_PROTOCOL &&
    isFilePreviewHostname(parsed.hostname) &&
    isFilePreviewContentPath(parsed.pathname)
  );
}

export function filePreviewSchemeToLoopbackHttpUrl(url: string): string | null {
  if (!isPrivilegedFilePreviewUrl(url)) {
    return null;
  }
  const parsed = new URL(url);
  const port = parsed.port.length > 0 ? parsed.port : "80";
  return `http://${FILE_PREVIEW_HOSTNAME}:${port}${parsed.pathname}${parsed.search}`;
}

export function rewriteToFilePreviewOrigin(
  url: string,
  base?: string,
  options?: RewriteFilePreviewOriginOptions,
): string {
  let parsed: URL;
  try {
    parsed = base === undefined ? new URL(url) : new URL(url, base);
  } catch {
    return url;
  }
  if (!isFilePreviewContentPath(parsed.pathname)) {
    return url;
  }
  if (parsed.protocol === FILE_PREVIEW_PROTOCOL) {
    return isFilePreviewHostname(parsed.hostname) ? parsed.href : url;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return url;
  }
  if (
    !isFilePreviewHostname(parsed.hostname) &&
    !isLoopbackPreviewSourceHost(parsed.hostname)
  ) {
    return url;
  }
  parsed.hostname = FILE_PREVIEW_HOSTNAME;
  if (options?.privilegedScheme === true) {
    const port = parsed.port.length > 0 ? `:${parsed.port}` : "";
    return `${FILE_PREVIEW_PROTOCOL}//${FILE_PREVIEW_HOSTNAME}${port}${parsed.pathname}${parsed.search}`;
  }
  return parsed.href;
}
