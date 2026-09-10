import { describe, expect, it } from "vitest";
import { emptyPromptDraftState } from "@bb/client-core";
import {
  appendMarkdownGrabToDraft,
  applyMarkdownGrabToDraftAccessor,
  findMarkdownGrabChipRegions,
  formatMarkdownGrabChipToken,
  formatMarkdownGrabQuote,
  formatMarkdownGrabSlug,
  serializeMarkdownGrabChip,
  stripMarkdownGrabHiddenPayload,
  type MarkdownGrabSelectedResult,
} from "./markdown-grab-quote.js";

const selected: MarkdownGrabSelectedResult = {
  path: "notes/Release Plan.md",
  fileName: "Release Plan.md",
  text: "Ship the chip.",
  contents: "# Plan\n\nShip the chip.\n",
};

describe("formatMarkdownGrabQuote", () => {
  it("keeps a compact chip and hides the snippet inside an HTML comment", () => {
    const quote = formatMarkdownGrabQuote(selected);

    expect(quote).toContain("@md:Release-Plan");
    expect(quote).toContain("<!-- bb-markdown-grab");
    expect(quote).toContain("Path: notes/Release Plan.md");
    expect(quote).toContain("File: Release Plan.md");
    expect(quote).toContain("Ship the chip.");
    expect(quote).not.toContain("> notes/Release Plan.md");
  });

  it("inserts the chip token into the draft and hides the rest from markdown", () => {
    const next = appendMarkdownGrabToDraft(emptyPromptDraftState(), selected);

    expect(next.text).toContain("@md:Release-Plan");
    expect(next.text).toContain("<!-- bb-markdown-grab");
    expect(next.text).not.toMatch(/^> /m);
    expect(formatMarkdownGrabChipToken(selected.fileName)).toBe(
      "@md:Release-Plan",
    );
    expect(stripMarkdownGrabHiddenPayload(next.text)).toBe("@md:Release-Plan");
    expect(stripMarkdownGrabHiddenPayload(next.text)).not.toContain(
      "Ship the chip.",
    );
  });

  it("serializes stored slugs back with a .md filename", () => {
    expect(serializeMarkdownGrabChip({ tagName: "Release-Plan" })).toBe(
      "@md:Release-Plan",
    );
    expect(formatMarkdownGrabSlug("Release Plan.md")).toBe("Release-Plan");
  });

  it("finds token-plus-payload regions", () => {
    const modern = formatMarkdownGrabQuote(selected);
    const regions = findMarkdownGrabChipRegions(modern);
    expect(regions).toHaveLength(1);
    expect(regions[0]?.tagName).toBe("Release-Plan");
    expect(regions[0]?.token).toBe("@md:Release-Plan");
    expect(regions[0]?.payload).toContain("<!-- bb-markdown-grab");
  });

  it("applies to a draft accessor only when the snippet is non-empty", () => {
    let draft = emptyPromptDraftState();
    const applied = applyMarkdownGrabToDraftAccessor(
      {
        getCurrent: () => draft,
        setDraft: (next) => {
          draft = next;
        },
      },
      selected,
    );
    expect(applied).toBe(true);
    expect(draft.text).toContain("@md:Release-Plan");

    const skipped = applyMarkdownGrabToDraftAccessor(
      {
        getCurrent: () => draft,
        setDraft: (next) => {
          draft = next;
        },
      },
      { ...selected, text: "   " },
    );
    expect(skipped).toBe(false);
  });
});
