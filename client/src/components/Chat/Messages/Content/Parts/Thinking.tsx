import { useState, useMemo, memo, useCallback, useId, type MouseEvent } from 'react';
import { useAtomValue } from 'jotai';
import { ChevronRight } from 'lucide-react';
import { Clipboard, CheckMark } from '@librechat/client';
import type { FC } from 'react';
import { useLocalize, useExpandCollapse } from '~/hooks';
import { showThinkingAtom } from '~/store/showThinking';
import { fontSizeAtom } from '~/store/fontSize';
import { cn } from '~/utils';

/**
 * ThinkingContent - Renders the reasoning text.
 * Quiet, Claude-style aside: no card or fill, just a left guide rail and muted text.
 */
export const ThinkingContent: FC<{
  children: React.ReactNode;
}> = memo(({ children }) => {
  const fontSize = useAtomValue(fontSizeAtom);

  return (
    <div className="border-l border-border-medium pl-4 text-text-secondary">
      <p className={cn('whitespace-pre-wrap leading-[26px]', fontSize)}>{children}</p>
    </div>
  );
});

/**
 * ThinkingButton - Disclosure row for the reasoning section.
 * A single rotating chevron plus a muted label; the label shimmers while the model is
 * still reasoning. Copy appears on hover once expanded.
 * Shared between the legacy Thinking component and modern Reasoning.
 */
export const ThinkingButton = memo(
  ({
    isExpanded,
    onClick,
    label,
    content,
    contentId,
    showCopyButton = true,
    isStreaming = false,
  }: {
    isExpanded: boolean;
    onClick: (e: MouseEvent<HTMLButtonElement>) => void;
    label: string;
    content?: string;
    contentId: string;
    showCopyButton?: boolean;
    isStreaming?: boolean;
  }) => {
    const localize = useLocalize();
    const fontSize = useAtomValue(fontSizeAtom);

    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (content) {
          navigator.clipboard.writeText(content);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      },
      [content],
    );

    return (
      <div className="group/thinking flex w-full items-center gap-1">
        <button
          type="button"
          onClick={onClick}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className={cn(
            'group/button flex flex-1 items-center justify-start gap-1.5 rounded-md text-left text-text-secondary transition-colors duration-150 hover:text-text-primary',
            fontSize,
          )}
        >
          <ChevronRight
            className={cn(
              'icon-sm shrink-0 transform-gpu text-text-tertiary transition-transform duration-200 group-hover/button:text-text-primary',
              isExpanded && 'rotate-90',
            )}
            aria-hidden="true"
          />
          <span className={cn('select-none font-medium', isStreaming && 'reasoning-shimmer')}>
            {label}
          </span>
        </button>
        {content && showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={
              isCopied
                ? localize('com_ui_copied_to_clipboard')
                : localize('com_ui_copy_thoughts_to_clipboard')
            }
            className={cn(
              'rounded-md p-1 text-text-tertiary transition-opacity',
              isExpanded
                ? 'opacity-0 group-focus-within/thinking-container:opacity-100 group-hover/thinking-container:opacity-100'
                : 'opacity-0',
              'hover:bg-surface-hover hover:text-text-primary',
              'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
            )}
          >
            <span className="sr-only">
              {isCopied
                ? localize('com_ui_copied_to_clipboard')
                : localize('com_ui_copy_thoughts_to_clipboard')}
            </span>
            {isCopied ? (
              <CheckMark className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Clipboard size="16" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    );
  },
);

/**
 * Thinking Component (LEGACY SYSTEM)
 *
 * Used for simple text-based messages with `:::thinking:::` markers.
 * For modern structured content (agents/assistants), see Reasoning.tsx component.
 */
const Thinking = memo(({ children }: { children: React.ReactNode }) => {
  const localize = useLocalize();
  const showThinking = useAtomValue(showThinkingAtom);
  const [isExpanded, setIsExpanded] = useState(showThinking);
  const contentId = useId();
  const { style: expandStyle, ref: expandRef } = useExpandCollapse(isExpanded);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsExpanded((prev) => !prev);
  }, []);

  const label = useMemo(() => localize('com_ui_thoughts'), [localize]);

  // Extract text content for copy functionality
  const textContent = useMemo(() => {
    if (typeof children === 'string') {
      return children;
    }
    return '';
  }, [children]);

  if (children == null) {
    return null;
  }

  return (
    <div className="group/thinking-container">
      <div className="mb-2 pt-2">
        <ThinkingButton
          isExpanded={isExpanded}
          onClick={handleClick}
          label={label}
          content={textContent}
          contentId={contentId}
        />
      </div>
      <div
        id={contentId}
        role="group"
        aria-label={label}
        aria-hidden={!isExpanded || undefined}
        className={cn(isExpanded && 'mb-4')}
        style={expandStyle}
      >
        <div className="overflow-hidden" ref={expandRef}>
          <ThinkingContent>{children}</ThinkingContent>
        </div>
      </div>
    </div>
  );
});

ThinkingButton.displayName = 'ThinkingButton';
ThinkingContent.displayName = 'ThinkingContent';
Thinking.displayName = 'Thinking';

export default Thinking;
