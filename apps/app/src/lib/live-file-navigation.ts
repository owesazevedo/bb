import type { ExperimentalFileLocation } from "@get-bb/plugin-sdk";
import {
  normalizeExperimentalFileOpenOptions,
  normalizeExperimentalLiveFileTarget,
} from "@get-bb/plugin-sdk/internal/file-navigation-validation";
import type { FilePreviewLineRange } from "@bb/client-core";
import type { AppFilePreviewIntent } from "@/lib/app-navigation-host";

export {
  normalizeExperimentalFileOpenOptions,
  normalizeExperimentalLiveFileTarget,
};

/**
 * Plugin payloads may only contain `target` and `location`. Host intents can
 * also carry `viewer`; strip that key before exact-key validation so the
 * shared BB preview override is not rejected.
 */
export function normalizeAppFilePreviewIntent(
  intent: AppFilePreviewIntent,
): AppFilePreviewIntent | null {
  const normalized = normalizeExperimentalFileOpenOptions({
    target: intent.target,
    location: intent.location,
  });
  if (normalized === null) return null;
  return intent.viewer === undefined
    ? normalized
    : { ...normalized, viewer: intent.viewer };
}

export function getExperimentalFileLocationStart(
  location: ExperimentalFileLocation | null,
): { columnNumber: number | null; lineNumber: number | null } {
  if (location === null) return { columnNumber: null, lineNumber: null };
  if (location.kind === "line") {
    return { columnNumber: location.column, lineNumber: location.line };
  }
  return { columnNumber: null, lineNumber: location.startLine };
}

export function toFilePreviewLineRange(
  location: ExperimentalFileLocation | null,
): FilePreviewLineRange | null {
  if (location === null) return null;
  return {
    startLineNumber:
      location.kind === "line" ? location.line : location.startLine,
    endLineNumber: location.kind === "line" ? location.line : location.endLine,
  };
}

export function getFileBasename(path: string): string {
  const normalizedPath = path.replace(/[\\/]+$/u, "");
  return normalizedPath.split(/[\\/]/u).at(-1) ?? path;
}
