import { describe, expect, it } from "vitest";
import { emptyPromptDraftState } from "@bb/client-core";
import { PERSONAL_PROJECT_ID } from "@bb/domain";
import {
  appendBrowserGrabToDraft,
  findBrowserGrabChipRegions,
  formatBrowserGrabChip,
  formatBrowserGrabQuote,
  resolveBrowserGrabDraftTarget,
  stripBrowserGrabHiddenPayload,
} from "./browser-grab-quote.js";

const selected = {
  kind: "selected" as const,
  tabId: "browser:a",
  url: "https://example.com/pricing",
  title: "Pricing",
  tagName: "button",
  selector: "#cta",
  html: '<button id="cta">Buy</button>',
  css: { color: "rgb(0, 0, 0)", display: "inline-block" },
  rect: { x: 0, y: 0, width: 10, height: 10 },
  screenshotDataUrl: null,
};

describe("formatBrowserGrabQuote", () => {
  it("keeps a compact chip and hides HTML inside an HTML comment", () => {
    const quote = formatBrowserGrabQuote(selected);

    expect(quote).toContain("@el:button");
    expect(quote).toContain("<!-- bb-browser-grab");
    expect(quote).toContain("Tag: button");
    expect(quote).toContain('<button id="cta">Buy</button>');
    expect(quote).not.toContain("Browser ·");
    expect(quote).not.toContain("<details>");
    expect(quote).not.toContain("```html");
    expect(quote).not.toContain("![Selected element]");
    expect(quote).not.toContain("Selected browser element");
  });

  it("inserts the chip token into the draft and hides the rest from markdown", () => {
    const next = appendBrowserGrabToDraft(emptyPromptDraftState(), selected);

    expect(next.text).toContain("@el:button");
    expect(next.text).toContain("<!-- bb-browser-grab");
    expect(next.text).not.toMatch(/^> /m);
    expect(next.text).not.toContain("<details>");
    expect(formatBrowserGrabChip(selected)).toBe("@el:button");
    expect(stripBrowserGrabHiddenPayload(next.text)).toBe("@el:button");
    expect(stripBrowserGrabHiddenPayload(next.text)).not.toContain(
      '<button id="cta">Buy</button>',
    );
  });

  it("finds token-plus-payload and legacy chip regions", () => {
    const modern = formatBrowserGrabQuote(selected);
    const modernRegions = findBrowserGrabChipRegions(modern);
    expect(modernRegions).toHaveLength(1);
    expect(modernRegions[0]?.tagName).toBe("button");
    expect(modernRegions[0]?.token).toBe("@el:button");
    expect(modernRegions[0]?.payload).toContain("<!-- bb-browser-grab");

    const legacy = [
      "> Browser · `#cta` · example.com/pricing",
      "",
      "<!-- bb-browser-grab",
      "Tag: button",
      "Selector: #cta",
      "HTML:",
      '<button id="cta">Buy</button>',
      "-->",
    ].join("\n");
    const legacyRegions = findBrowserGrabChipRegions(legacy);
    expect(legacyRegions).toHaveLength(1);
    expect(legacyRegions[0]?.tagName).toBe("button");
    expect(legacyRegions[0]?.start).toBe(0);
    expect(stripBrowserGrabHiddenPayload(legacy)).toBe("@el:button");
  });

  it("quotes into the real thread when the panel id is a thread", () => {
    expect(
      resolveBrowserGrabDraftTarget({
        panelThreadId: "thr_abc",
        routeProjectId: "proj_work",
        routeThreadId: undefined,
      }),
    ).toEqual({
      kind: "thread",
      projectId: "proj_work",
      threadId: "thr_abc",
    });
  });

  it("falls back to the route thread, then the new-thread composer", () => {
    expect(
      resolveBrowserGrabDraftTarget({
        panelThreadId: "plugin-page:docs",
        routeProjectId: "proj_work",
        routeThreadId: "thr_from_route",
      }),
    ).toEqual({
      kind: "thread",
      projectId: "proj_work",
      threadId: "thr_from_route",
    });
    expect(
      resolveBrowserGrabDraftTarget({
        panelThreadId: "plugin-page:docs",
        routeProjectId: undefined,
        routeThreadId: undefined,
      }),
    ).toEqual({ kind: "new-thread" });
    expect(
      resolveBrowserGrabDraftTarget({
        panelThreadId: "thr_abc",
        routeProjectId: undefined,
        routeThreadId: undefined,
      }),
    ).toEqual({
      kind: "thread",
      projectId: PERSONAL_PROJECT_ID,
      threadId: "thr_abc",
    });
  });
});
