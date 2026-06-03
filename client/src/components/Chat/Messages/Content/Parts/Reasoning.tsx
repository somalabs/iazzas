import { memo, useMemo, useState, useEffect, useCallback, useId } from 'react';
import { ContentTypes } from 'librechat-data-provider';
import type { MouseEvent } from 'react';
import { ThinkingContent, ThinkingButton } from './Thinking';
import { useLocalize, useExpandCollapse } from '~/hooks';
import { useMessageContext } from '~/Providers';
import { cn } from '~/utils';

type ReasoningProps = {
  reasoning: string;
  isLast: boolean;
};

/**
 * Reasoning Component (MODERN SYSTEM)
 *
 * Used for structured content parts with ContentTypes.THINK type.
 * Pattern: `{ content: [{ type: "think", think: "<think>content</think>" }, ...] }`
 *
 * Renders a quiet, Claude-style disclosure: a rotating chevron with a muted label that
 * shimmers while the model is still reasoning, and the reasoning text behind a left
 * guide rail when expanded.
 *
 * For legacy text-based messages, see Thinking.tsx component.
 */
const Reasoning = memo(({ reasoning, isLast }: ReasoningProps) => {
  const contentId = useId();
  const localize = useLocalize();
  const { isSubmitting, isLatestMessage, nextType } = useMessageContext();
  const effectiveIsSubmitting = isLatestMessage ? isSubmitting : false;
  const isStreaming = Boolean(effectiveIsSubmitting && isLast);
  const [isExpanded, setIsExpanded] = useState(false);
  const { style: expandStyle, ref: expandRef } = useExpandCollapse(isExpanded);

  useEffect(() => {
    if (!effectiveIsSubmitting && isLast) {
      setIsExpanded(false);
    }
  }, [effectiveIsSubmitting, isLast]);

  // Strip <think> tags from the reasoning content (modern format)
  const reasoningText = useMemo(() => {
    return reasoning
      .replace(/^<think>\s*/, '')
      .replace(/\s*<\/think>$/, '')
      .trim();
  }, [reasoning]);

  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsExpanded((prev) => !prev);
  }, []);

  const label = useMemo(() => {
    if (isStreaming) {
      return localize('com_ui_ux_reasoning_analisando');
    }
    return localize('com_ui_ux_reasoning_label');
  }, [isStreaming, localize]);

  if (!reasoningText) {
    return null;
  }

  return (
    <div className="group/reasoning">
      <div className="group/thinking-container">
        <div className="mb-2 pt-2">
          <ThinkingButton
            isExpanded={isExpanded}
            onClick={handleClick}
            label={label}
            content={reasoningText}
            contentId={contentId}
            isStreaming={isStreaming}
          />
        </div>
        <div
          id={contentId}
          role="group"
          aria-label={label}
          aria-hidden={!isExpanded || undefined}
          className={cn(nextType !== ContentTypes.THINK && isExpanded && 'mb-4')}
          style={expandStyle}
        >
          <div className="overflow-hidden" ref={expandRef}>
            <ThinkingContent>{reasoningText}</ThinkingContent>
          </div>
        </div>
      </div>
    </div>
  );
});

Reasoning.displayName = 'Reasoning';

export default Reasoning;
