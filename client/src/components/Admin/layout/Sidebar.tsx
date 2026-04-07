import { NavLink } from 'react-router-dom';
import { useMediaQuery } from '@librechat/client';
import { Users, Shield, UsersRound, KeyRound, Settings, BarChart3 } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

const navItems = [
  { path: '/d/admin/users', icon: Users, labelKey: 'com_admin_nav_users' as const },
  { path: '/d/admin/roles', icon: Shield, labelKey: 'com_admin_nav_roles' as const },
  { path: '/d/admin/groups', icon: UsersRound, labelKey: 'com_admin_nav_groups' as const },
  { path: '/d/admin/grants', icon: KeyRound, labelKey: 'com_admin_nav_grants' as const },
  { path: '/d/admin/configs', icon: Settings, labelKey: 'com_admin_nav_configs' as const },
  { path: '/d/admin/analytics', icon: BarChart3, labelKey: 'com_admin_nav_analytics' as const },
];

export default function AdminSidebar() {
  const localize = useLocalize();
  const isSmall = useMediaQuery('(max-width: 768px)');

  return (
    <nav
      className={cn(
        'flex flex-col gap-1 border-r border-border-medium bg-surface-secondary p-2',
        isSmall ? 'w-14' : 'w-52',
      )}
    >
      {!isSmall && (
        <h2 className="mb-2 px-3 py-2 text-sm font-semibold text-text-secondary">
          {localize('com_admin_panel')}
        </h2>
      )}
      {navItems.map(({ path, icon: Icon, labelKey }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-surface-submit text-white'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              isSmall && 'justify-center px-2',
            )
          }
        >
          <Icon size={18} />
          {!isSmall && <span>{localize(labelKey)}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
