import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { PROMPT_MENTION_PILL_CLASS } from "@/components/promptbox/mentions/prompt-mention-display";
import { MarkdownGrabChip } from "@/components/ui/markdown-markdown-grab";
import { cn } from "@bb/shared-ui/lib/utils";
import { formatMarkdownGrabSlug } from "@/lib/markdown-grab-quote";

const EDITOR_GRAB_PILL_CLASS = cn(
  "group",
  PROMPT_MENTION_PILL_CLASS,
  "cursor-default selection:bg-transparent [&_*]:selection:bg-transparent",
);

export function MarkdownGrabPillNodeView({ node }: NodeViewProps) {
  const tagName = formatMarkdownGrabSlug(
    typeof node.attrs.tagName === "string" ? `${node.attrs.tagName}.md` : "note.md",
  );
  const title = typeof node.attrs.title === "string" ? node.attrs.title : "";

  return (
    <NodeViewWrapper
      as="span"
      className={EDITOR_GRAB_PILL_CLASS}
      data-markdown-grab-chip="true"
      title={title || undefined}
    >
      <MarkdownGrabChip
        bare
        iconClassName="-ml-px size-4 shrink-0 self-center text-muted-foreground"
        tagName={tagName}
      />
    </NodeViewWrapper>
  );
}
