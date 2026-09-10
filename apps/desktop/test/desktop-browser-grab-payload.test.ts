import { describe, expect, it } from "vitest";
import {
  clampBrowserGrabGuestSelection,
  isBrowserGrabCancellationPayload,
} from "../src/desktop-browser-grab-payload.js";

describe("clampBrowserGrabGuestSelection", () => {
  it("keeps a well-formed selection and drops unknown CSS keys", () => {
    expect(
      clampBrowserGrabGuestSelection({
        tagName: "DIV",
        selector: "#hero",
        html: "<div id=\"hero\">Hi</div>",
        css: { color: "red", unknown: "nope" },
        rect: { x: 1, y: 2, width: 3, height: 4 },
      }),
    ).toEqual({
      tagName: "div",
      selector: "#hero",
      html: "<div id=\"hero\">Hi</div>",
      css: { color: "red" },
      rect: { x: 1, y: 2, width: 3, height: 4 },
    });
  });

  it("rejects missing tag names and invalid rects", () => {
    expect(
      clampBrowserGrabGuestSelection({
        tagName: " ",
        selector: "#hero",
        html: "<div></div>",
        css: {},
        rect: { x: 1, y: 2, width: 3, height: 4 },
      }),
    ).toBeNull();
    expect(
      clampBrowserGrabGuestSelection({
        tagName: "div",
        selector: "#hero",
        html: "<div></div>",
        css: {},
        rect: { x: 1, y: 2, width: -1, height: 4 },
      }),
    ).toBeNull();
  });
});

describe("isBrowserGrabCancellationPayload", () => {
  it("detects the guest cancellation marker", () => {
    expect(isBrowserGrabCancellationPayload({ cancelled: true })).toBe(true);
    expect(isBrowserGrabCancellationPayload({ tagName: "div" })).toBe(false);
  });
});
