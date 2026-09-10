import type { ComponentType } from "react";
import type { Nodes, Parent, PhrasingContent, Text } from "mdast";
import type {} from "mdast-util-to-hast";
import { visit } from "unist-util-visit";
import { Icon } from "@bb/shared-ui/icon";
import { cn } from "@bb/shared-ui/lib/utils";
import { PROMPT_MENTION_PILL_CLASS } from "@/components/promptbox/mentions/prompt-mention-display";

const MARKDOWN_GRAB_CHIP_PATTERN = /@md:([A-Za-z][\w.-]*)/g;
const MARKDOWN_GRAB_CHIP_HAST_NAME = "bb-md-grab-chip";
const MARKDOWN_GRAB_TAG_PROPERTY = "dataTagName";

interface MarkdownGrabChipProps {
  bare?: boolean;
  className?: string;
  iconClassName?: string;
  tagName: string;
  title?: string;
}

export function MarkdownGrabChip({
  bare = false,
  className,
  iconClassName = "size-3.5 shrink-0 self-center text-muted-foreground",
  tagName,
  title,
}: MarkdownGrabChipProps) {
  return (
    <span
      className={cn(
        bare
          ? "inline-flex max-w-full items-baseline gap-0.5 align-baseline font-normal"
          : [PROMPT_MENTION_PILL_CLASS, "cursor-default bg-surface-raised/50 font-normal"],
        className,
      )}
      data-markdown-grab-chip={bare ? undefined : "true"}
      title={title || undefined}
    >
      <Icon name="FileText" className={iconClassName} aria-hidden />
      <span className="truncate">{tagName}</span>
    </span>
  );
}

function markdownGrabChipNode(tagName: string): Text {
  return {
    type: "text",
    value: "",
    data: {
      hName: MARKDOWN_GRAB_CHIP_HAST_NAME,
      hProperties: {
        [MARKDOWN_GRAB_TAG_PROPERTY]: tagName,
        "data-tag-name": tagName,
      },
    },
  };
}

function splitTextNodeOnMarkdownGrabChips(node: Text): PhrasingContent[] {
  const { value } = node;
  MARKDOWN_GRAB_CHIP_PATTERN.lastIndex = 0;
  const replacements: PhrasingContent[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKDOWN_GRAB_CHIP_PATTERN.exec(value)) !== null) {
    const tagName = match[1];
    if (tagName === undefined) {
      continue;
    }
    if (match.index > cursor) {
      replacements.push({
        type: "text",
        value: value.slice(cursor, match.index),
      });
    }
    replacements.push(markdownGrabChipNode(tagName));
    cursor = match.index + match[0].length;
  }
  if (replacements.length === 0) {
    return [node];
  }
  if (cursor < value.length) {
    replacements.push({ type: "text", value: value.slice(cursor) });
  }
  return replacements;
}

export function remarkMarkdownGrabChips() {
  return (tree: Nodes): void => {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (parent === undefined || index === undefined) {
        return;
      }
      const replacements = splitTextNodeOnMarkdownGrabChips(node);
      if (replacements.length === 1 && replacements[0] === node) {
        return;
      }
      parent.children.splice(index, 1, ...replacements);
      return index + replacements.length;
    });
  };
}

interface MarkdownGrabChipElementProps {
  "data-tag-name"?: string;
  dataTagName?: string;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "bb-md-grab-chip": MarkdownGrabChipElementProps;
    }
  }
}

export function buildMarkdownGrabChipComponent(): ComponentType<MarkdownGrabChipElementProps> {
  function MarkdownGrabChipElement(props: MarkdownGrabChipElementProps) {
    const tagName = props["data-tag-name"] ?? props.dataTagName;
    if (tagName === undefined || tagName.length === 0) {
      return null;
    }
    return <MarkdownGrabChip tagName={tagName} />;
  }

  return MarkdownGrabChipElement;
}
