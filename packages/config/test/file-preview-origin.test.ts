import { describe, expect, it } from "vitest";
import {
  FILE_PREVIEW_HOSTNAME,
  FILE_PREVIEW_PROTOCOL,
  SANDBOXED_HTML_PREVIEW_CSP,
  filePreviewSchemeToLoopbackHttpUrl,
  htmlPreviewCspForRequestHost,
  isFilePreviewContentPath,
  isFilePreviewHostname,
  isFilePreviewOriginApiRequest,
  isPrivilegedFilePreviewUrl,
  rewriteToFilePreviewOrigin,
} from "../src/file-preview-origin.js";

describe("file preview origin", () => {
  it("recognizes the dedicated preview hostname", () => {
    expect(isFilePreviewHostname(FILE_PREVIEW_HOSTNAME)).toBe(true);
    expect(isFilePreviewHostname("PREVIEW.localhost.")).toBe(true);
    expect(isFilePreviewHostname("localhost")).toBe(false);
  });

  it("allows only GET/HEAD preview content paths on the preview origin", () => {
    expect(
      isFilePreviewOriginApiRequest(
        "GET",
        "/api/v1/file-previews/lease/index.html",
      ),
    ).toBe(true);
    expect(
      isFilePreviewOriginApiRequest(
        "HEAD",
        "/api/v1/threads/thr_1/worktree/files/docs/page.html",
      ),
    ).toBe(true);
    expect(
      isFilePreviewOriginApiRequest("GET", "/api/v1/threads/thr_1/files/raw"),
    ).toBe(true);
    expect(isFilePreviewOriginApiRequest("GET", "/api/v1/threads")).toBe(false);
    expect(
      isFilePreviewOriginApiRequest(
        "POST",
        "/api/v1/file-previews/lease/index.html",
      ),
    ).toBe(false);
  });

  it("drops the HTML sandbox CSP only on the preview host", () => {
    expect(htmlPreviewCspForRequestHost("localhost:11003")).toBe(
      SANDBOXED_HTML_PREVIEW_CSP,
    );
    expect(
      htmlPreviewCspForRequestHost(`${FILE_PREVIEW_HOSTNAME}:11003`),
    ).toBeNull();
  });

  it("rewrites loopback preview URLs onto the isolated hostname", () => {
    expect(
      rewriteToFilePreviewOrigin(
        "/api/v1/file-previews/lease/index.html",
        "http://localhost:11003",
      ),
    ).toBe(`http://${FILE_PREVIEW_HOSTNAME}:11003/api/v1/file-previews/lease/index.html`);
    expect(
      rewriteToFilePreviewOrigin(
        "http://127.0.0.1:11003/api/v1/threads/thr_1/worktree/files/a.html",
      ),
    ).toBe(
      `http://${FILE_PREVIEW_HOSTNAME}:11003/api/v1/threads/thr_1/worktree/files/a.html`,
    );
    expect(isFilePreviewContentPath("/preview/docs/report.html")).toBe(false);
    expect(
      rewriteToFilePreviewOrigin(
        "http://192.168.1.5:11003/api/v1/file-previews/lease/index.html",
      ),
    ).toBe("http://192.168.1.5:11003/api/v1/file-previews/lease/index.html");
  });

  it("rewrites loopback previews onto the privileged desktop scheme", () => {
    expect(
      rewriteToFilePreviewOrigin(
        "/api/v1/file-previews/lease/index.html",
        "http://localhost:11003",
        { privilegedScheme: true },
      ),
    ).toBe(
      `${FILE_PREVIEW_PROTOCOL}//${FILE_PREVIEW_HOSTNAME}:11003/api/v1/file-previews/lease/index.html`,
    );
    expect(
      isPrivilegedFilePreviewUrl(
        `${FILE_PREVIEW_PROTOCOL}//${FILE_PREVIEW_HOSTNAME}:11003/api/v1/file-previews/lease/index.html`,
      ),
    ).toBe(true);
    expect(
      filePreviewSchemeToLoopbackHttpUrl(
        `${FILE_PREVIEW_PROTOCOL}//${FILE_PREVIEW_HOSTNAME}:11003/api/v1/file-previews/lease/index.html`,
      ),
    ).toBe(
      `http://${FILE_PREVIEW_HOSTNAME}:11003/api/v1/file-previews/lease/index.html`,
    );
  });
});
