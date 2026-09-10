import type { ComponentType } from "react";
import type { Nodes, Parent, PhrasingContent, Text } from "mdast";
import type {} from "mdast-util-to-hast";
import { visit } from "unist-util-visit";
import { Icon } from "@bb/shared-ui/icon";
import { cn } from "@bb/shared-ui/lib/utils";
import { PROMPT_MENTION_PILL_CLASS } from "@/components/promptbox/mentions/prompt-mention-display";

const BROWSER_GRAB_CHIP_PATTERN = /@el:([A-Za-z][\w:-]*)/g;
const BROWSER_GRAB_CHIP_HAST_NAME = "bb-browser-grab-chip";
const BROWSER_GRAB_TAG_PROPERTY = "dataTagName";

interface BrowserGrabChipProps {
  bare?: boolean;
  className?: string;
  iconClassName?: string;
  tagName: string;
  title?: string;
}

export function BrowserGrabChip({
  bare = false,
  className,
  iconClassName = "size-3.5 shrink-0 self-center text-muted-foreground",
  tagName,
  title,
}: BrowserGrabChipProps) {
  return (
    <span
      className={cn(
        bare
          ? "inline-flex max-w-full items-baseline gap-0.5 align-baseline font-normal"
          : [PROMPT_MENTION_PILL_CLASS, "cursor-default bg-surface-raised/50 font-normal"],
        className,
      )}
      data-browser-grab-chip={bare ? undefined : "true"}
      title={title || undefined}
    >
      <Icon name="Target" className={iconClassName} aria-hidden />
      <span className="truncate">{tagName}</span>
    </span>
  );
}

function browserGrabChipNode(tagName: string): Text {
  return {
    type: "text",
    value: "",
    data: {
      hName: BROWSER_GRAB_CHIP_HAST_NAME,
      hProperties: {
        [BROWSER_GRAB_TAG_PROPERTY]: tagName,
        "data-tag-name": tagName,
      },
    },
  };
}

function splitTextNodeOnBrowserGrabChips(node: Text): PhrasingContent[] {
  const { value } = node;
  BROWSER_GRAB_CHIP_PATTERN.lastIndex = 0;
  const replacements: PhrasingContent[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = BROWSER_GRAB_CHIP_PATTERN.exec(value)) !== null) {
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
    replacements.push(browserGrabChipNode(tagName));
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

export function remarkBrowserGrabChips() {
  return (tree: Nodes): void => {
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (parent === undefined || index === undefined) {
        return;
      }
      const replacements = splitTextNodeOnBrowserGrabChips(node);
      if (replacements.length === 1 && replacements[0] === node) {
        return;
      }
      parent.children.splice(index, 1, ...replacements);
      return index + replacements.length;
    });
  };
}

interface BrowserGrabChipElementProps {
  "data-tag-name"?: string;
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "bb-browser-grab-chip": BrowserGrabChipElementProps;
    }
  }
}

export function buildBrowserGrabChipComponent(): ComponentType<BrowserGrabChipElementProps> {
  function BrowserGrabChipElement(props: BrowserGrabChipElementProps) {
    const tagName = props["data-tag-name"];
    if (tagName === undefined || tagName.length === 0) {
      return null;
    }
    return <BrowserGrabChip tagName={tagName} />;
  }

  return BrowserGrabChipElement;
}
