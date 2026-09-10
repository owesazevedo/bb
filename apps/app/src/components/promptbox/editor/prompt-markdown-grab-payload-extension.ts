import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PROMPT_MENTION_PILL_CLASS } from "@/components/promptbox/mentions/prompt-mention-display";
import {
  formatMarkdownGrabSlug,
  MARKDOWN_GRAB_PAYLOAD_NODE_NAME,
  serializeMarkdownGrabChip,
} from "@/lib/markdown-grab-quote";
import { MarkdownGrabPillNodeView } from "./MarkdownGrabPillNodeView";

function grabAttrString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export { MARKDOWN_GRAB_PAYLOAD_NODE_NAME };

export const PromptMarkdownGrabPayloadExtension = Node.create({
  name: MARKDOWN_GRAB_PAYLOAD_NODE_NAME,
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
        default: "note",
      },
      title: {
        default: "",
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-markdown-grab-chip]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    const tagName = formatMarkdownGrabSlug(
      `${grabAttrString(node.attrs.tagName, "note")}.md`,
    );
    const title = grabAttrString(node.attrs.title);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: PROMPT_MENTION_PILL_CLASS,
        "data-markdown-grab-chip": "true",
        "data-tag-name": tagName,
        title: title.length > 0 ? title : undefined,
      }),
      tagName,
    ];
  },
  renderText({ node }) {
    return serializeMarkdownGrabChip({
      payload: grabAttrString(node.attrs.payload),
      tagName: grabAttrString(node.attrs.tagName, "note"),
    });
  },
  addNodeView() {
    return ReactNodeViewRenderer(MarkdownGrabPillNodeView);
  },
});
