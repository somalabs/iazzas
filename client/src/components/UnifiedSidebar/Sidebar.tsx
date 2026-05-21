import { memo } from 'react';
import type { NavLink } from '~/common';
import ExpandedPanel from './ExpandedPanel';

function Sidebar({
  links,
  expanded,
  onToggle,
}: {
  links: NavLink[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <ExpandedPanel links={links} expanded={expanded} onToggle={onToggle} />
    </div>
  );
}

export default memo(Sidebar);
