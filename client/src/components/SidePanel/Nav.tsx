import type { NavLink } from '~/common';
import { useActivePanel, resolveActivePanel } from '~/Providers';

export default function Nav({ links }: { links: NavLink[] }) {
  const { active } = useActivePanel();
  const panelLinks = links.filter((l) => !l.href && !l.separator);
  const effectiveActive = resolveActivePanel(active, panelLinks);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden pt-2 text-text-primary">
      {panelLinks.map((link) =>
        link.id === effectiveActive && link.Component ? <link.Component key={link.id} /> : null,
      )}
    </div>
  );
}
