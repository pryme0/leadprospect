'use client';

/**
 * Shared markdown renderer for all AI-generated content.
 * Handles headings (#–####, **bold headings**), bullets, sub-bullets,
 * numbered lists, bold/italic inline formatting, and strips stray markdown.
 */

/** Convert inline markdown (bold, italic) to HTML and strip leftover markers */
export function formatInline(text: string): string {
  return text
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    // Italic: *text* (but not ** which is bold)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="text-[#00CEC8]/80">$1</em>')
    // Strip any leftover stray * or ** that didn't pair
    .replace(/\*{1,2}/g, '')
    // Strip leftover # at start of line fragments
    .replace(/^#{1,4}\s*/g, '');
}

/** Clean a raw AI response: strip markdown artifacts that shouldn't render literally */
export function cleanMarkdown(text: string): string {
  return text
    // Normalise bold-wrapped headings: **1. Week 1-2: Title** → ### 1. Week 1-2: Title
    .replace(/^\*\*(\d+\.\s*Week[\s\S]*?)\*\*\s*$/gm, '### $1')
    // Normalise any remaining full-line bold as heading: **Some Heading** → ### Some Heading
    .replace(/^\*\*([^*\n]{4,})\*\*\s*$/gm, '### $1');
}

export default function MarkdownBody({ text }: { text: string }) {
  const cleaned = cleanMarkdown(text);
  const lines = cleaned.split('\n').filter((l) => {
    const t = l.trim();
    // Skip empty lines, horizontal rules, and lone # markers
    return t && t !== '---' && /[^#]/.test(t);
  });

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // h1: # heading (but not ##)
        if (/^#\s+/.test(trimmed) && !/^##/.test(trimmed)) {
          return (
            <h1 key={i} className="text-white font-bold text-lg mt-6 mb-2 first:mt-0 border-b border-brand-slate/40 pb-1.5">
              {formatInlineText(trimmed.replace(/^#\s+/, ''))}
            </h1>
          );
        }

        // h2: ## heading (but not ###)
        if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
          return (
            <h2 key={i} className="text-white font-semibold text-base mt-5 mb-2 first:mt-0">
              {formatInlineText(trimmed.replace(/^##\s+/, ''))}
            </h2>
          );
        }

        // h3: ### heading (but not ####)
        if (/^###\s+/.test(trimmed) && !/^####/.test(trimmed)) {
          return (
            <h3 key={i} className="text-white font-semibold text-sm mt-4 mb-1.5 first:mt-0 border-b border-brand-slate/30 pb-1">
              {formatInlineText(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // h4: #### heading
        if (/^####\s+/.test(trimmed)) {
          return (
            <p key={i} className="text-[#00CEC8] font-semibold text-xs uppercase tracking-wide mt-3 mb-1">
              {formatInlineText(trimmed.replace(/^####\s+/, ''))}
            </p>
          );
        }

        // Sub-bullet (indented - or *)
        if (/^\s{2,}[-*]/.test(line)) {
          return (
            <div key={i} className="flex items-start gap-2 pl-5">
              <span className="text-[#00CEC8]/50 mt-1.5 shrink-0 text-[10px]">◦</span>
              <span className="text-brand-light/80 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s*/, '')) }} />
            </div>
          );
        }

        // Top-level bullet
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#00CEC8] mt-1.5 shrink-0 text-xs">▸</span>
              <span className="text-brand-light text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInline(trimmed.replace(/^[-*]\s+/, '')) }} />
            </div>
          );
        }

        // Numbered list item: 1. text
        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-3">
              <span className="text-[#00CEC8] font-bold text-xs mt-1 shrink-0 w-4 text-right">{numMatch[1]}.</span>
              <span className="text-brand-light text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
            </div>
          );
        }

        // Bold label line: **Label:** followed by text on the same line
        if (/^\*\*[^*]+\*\*/.test(trimmed)) {
          return (
            <p key={i} className="text-white text-sm leading-relaxed mt-2"
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
          );
        }

        // Regular paragraph
        if (trimmed) {
          return (
            <p key={i} className="text-brand-light/80 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
          );
        }

        return null;
      })}
    </div>
  );
}

/** Strip markdown from plain text (for headings rendered as React text nodes, not HTML) */
function formatInlineText(text: string): string {
  return text.replace(/\*{1,2}/g, '').replace(/^#{1,4}\s*/g, '');
}
