import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { PROMPT_MENTION_PILL_CLASS } from "@/components/promptbox/mentions/prompt-mention-display";
import { BrowserGrabChip } from "@/components/ui/markdown-browser-grab";
import { cn } from "@bb/shared-ui/lib/utils";
import { normalizeBrowserGrabTagName } from "@/lib/browser-grab-quote";

const EDITOR_GRAB_PILL_CLASS = cn(
  "group",
  PROMPT_MENTION_PILL_CLASS,
  "cursor-default selection:bg-transparent [&_*]:selection:bg-transparent",
);

export function BrowserGrabPillNodeView({ node }: NodeViewProps) {
  const tagName = normalizeBrowserGrabTagName(
    typeof node.attrs.tagName === "string" ? node.attrs.tagName : "element",
  );
  const title = typeof node.attrs.title === "string" ? node.attrs.title : "";

  return (
    <NodeViewWrapper
      as="span"
      className={EDITOR_GRAB_PILL_CLASS}
      data-browser-grab-chip="true"
      title={title || undefined}
    >
      <BrowserGrabChip
        bare
        iconClassName="-ml-px size-4 shrink-0 self-center text-muted-foreground"
        tagName={tagName}
      />
    </NodeViewWrapper>
  );
}
