import { memo } from 'react';
import { useMediaQuery } from '@librechat/client';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';

/**
 * The conversation list, rendered as a fixed column on the chat screen.
 * Hidden on small screens (the global rail handles mobile navigation).
 */
function ConversationsColumn() {
  const isSmallScreen = useMediaQuery('(max-width: 768px)');
  if (isSmallScreen) {
    return null;
  }
  return (
    <div className="flex h-full w-72 flex-shrink-0 flex-col overflow-hidden border-r border-border-light bg-surface-primary-alt">
      <ConversationsSection />
    </div>
  );
}

export default memo(ConversationsColumn);
