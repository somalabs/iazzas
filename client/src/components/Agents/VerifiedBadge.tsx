import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

const SIZE_CLASS: Record<NonNullable<VerifiedBadgeProps['size']>, string> = {
  sm: 'size-5',
  md: 'size-7',
};

/**
 * Platform-curated trust badge shown next to verified (homologated) agents.
 * Rendered as a solid blue seal with a white check (Instagram-style).
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', size = 'sm' }) => {
  const localize = useLocalize();
  const label = localize('com_agents_verified');

  return (
    <span title={label} className="inline-flex flex-shrink-0 items-center">
      <BadgeCheck
        role="img"
        aria-label={label}
        strokeWidth={2.25}
        className={cn('fill-blue-500 text-white', SIZE_CLASS[size], className)}
      />
    </span>
  );
};

export default VerifiedBadge;
