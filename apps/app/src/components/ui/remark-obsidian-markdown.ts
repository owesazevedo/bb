import type { Blockquote, Nodes, Parent, PhrasingContent, Text } from "mdast";
import type {} from "mdast-util-to-hast";
import { visit } from "unist-util-visit";

const CALLOUT_MARKER_PATTERN =
  /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\][ \t]*/iu;
const WIKILINK_PATTERN = /\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/g;
const WIKILINK_HAST_NAME = "bb-wikilink";

const SKIP_WIKILINK_PARENTS = new Set([
  "code",
  "inlineCode",
  "definition",
  "html",
]);

function wikilinkNode(target: string, label: string): Text {
  return {
    type: "text",
    value: label,
    data: {
      hName: "span",
      hProperties: {
        className: WIKILINK_HAST_NAME,
        dataTarget: target,
        "data-target": target,
        title: target,
      },
    },
  };
}

function splitTextNodeOnWikilinks(node: Text): PhrasingContent[] {
  const { value } = node;
  WIKILINK_PATTERN.lastIndex = 0;
  const replacements: PhrasingContent[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_PATTERN.exec(value)) !== null) {
    const target = match[1]?.trim();
    if (target === undefined || target.length === 0) {
      continue;
    }
    const label = match[2]?.trim() || target;
    if (match.index > cursor) {
      replacements.push({
        type: "text",
        value: value.slice(cursor, match.index),
      });
    }
    replacements.push(wikilinkNode(target, label));
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

function applyCalloutMarker(node: Blockquote): void {
  const first = node.children[0];
  if (first === undefined || first.type !== "paragraph") {
    return;
  }
  const firstChild = first.children[0];
  if (firstChild === undefined || firstChild.type !== "text") {
    return;
  }
  const match = firstChild.value.match(CALLOUT_MARKER_PATTERN);
  const kind = match?.[1]?.toLowerCase();
  if (match === null || kind === undefined) {
    return;
  }
  firstChild.value = firstChild.value.slice(match[0].length);
  node.data = {
    ...node.data,
    hProperties: {
      ...((node.data?.hProperties as Record<string, unknown> | undefined) ?? {}),
      dataCallout: kind,
      "data-callout": kind,
    },
  };
}

export function remarkObsidianMarkdown() {
  return (tree: Nodes): void => {
    visit(tree, "blockquote", (node: Blockquote) => {
      applyCalloutMarker(node);
    });
    visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
      if (parent === undefined || index === undefined) {
        return;
      }
      if (SKIP_WIKILINK_PARENTS.has(parent.type)) {
        return;
      }
      const replacements = splitTextNodeOnWikilinks(node);
      if (replacements.length === 1 && replacements[0] === node) {
        return;
      }
      parent.children.splice(index, 1, ...replacements);
      return index + replacements.length;
    });
  };
}
