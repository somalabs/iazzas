import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Platform-curated trust badge shown next to verified (homologated) agents.
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ className = '', size = 'sm' }) => {
  const localize = useLocalize();
  const label = localize('com_agents_verified');

  return (
    <span title={label} className="inline-flex flex-shrink-0 items-center">
      <BadgeCheck
        role="img"
        aria-label={label}
        className={cn('text-blue-500', size === 'sm' ? 'size-4' : 'size-5', className)}
      />
    </span>
  );
};

export default VerifiedBadge;
