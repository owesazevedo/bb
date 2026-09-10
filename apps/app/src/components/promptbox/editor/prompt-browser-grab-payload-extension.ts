import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PROMPT_MENTION_PILL_CLASS } from "@/components/promptbox/mentions/prompt-mention-display";
import {
  normalizeBrowserGrabTagName,
  serializeBrowserGrabChip,
} from "@/lib/browser-grab-quote";
import { BrowserGrabPillNodeView } from "./BrowserGrabPillNodeView";

export const BROWSER_GRAB_PAYLOAD_NODE_NAME = "browserGrabPayload";

function grabAttrString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export const PromptBrowserGrabPayloadExtension = Node.create({
  name: BROWSER_GRAB_PAYLOAD_NODE_NAME,
  group: "inline",
  inline: true,
  atom: true,
  isolating: false,
  draggable: false,
  selectable: true,
  addAttributes() {
    return {
      payload: {
        default: "",
      },
      tagName: {
        default: "element",
      },
      title: {
        default: "",
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-browser-grab-chip]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const tagName = normalizeBrowserGrabTagName(
      grabAttrString(node.attrs.tagName, "element"),
    );
    const title = grabAttrString(node.attrs.title);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: PROMPT_MENTION_PILL_CLASS,
        "data-browser-grab-chip": "true",
        "data-tag-name": tagName,
        title: title.length > 0 ? title : undefined,
      }),
      tagName,
    ];
  },
  renderText({ node }) {
    return serializeBrowserGrabChip({
      payload: grabAttrString(node.attrs.payload),
      tagName: grabAttrString(node.attrs.tagName, "element"),
    });
  },
  addNodeView() {
    return ReactNodeViewRenderer(BrowserGrabPillNodeView);
  },
});
