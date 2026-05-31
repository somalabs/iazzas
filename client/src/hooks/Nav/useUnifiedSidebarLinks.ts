import { useMemo } from 'react';
import { CalendarClock, ShieldCheck, MessageSquare } from 'lucide-react';
import {
  CabideIcon,
  CabideIconFilled,
  ManequimIcon,
  ManequimIconFilled,
  CarretelIcon,
  CarretelIconFilled,
} from '~/components/icons/fashion';
import type { NavLink } from '~/common';

/**
 * Navigation-only rail links. Each entry routes; none open a content drawer.
 * The conversation list lives on the chat screen, not in the rail.
 */
export default function useUnifiedSidebarLinks() {
  return useMemo<NavLink[]>(
    () => [
      {
        title: 'com_ui_ux_rail_conversas',
        description: 'com_ui_ux_rail_conversas_desc',
        icon: MessageSquare,
        id: 'nav-chats',
        href: '/c/new',
      },
      { id: 'sep-0', separator: true },
      {
        title: 'com_ui_ux_nav_studio_imagens',
        description: 'com_ui_ux_rail_studio_desc',
        icon: CabideIcon,
        iconFilled: CabideIconFilled,
        id: 'nav-studio',
        href: '/d/studio',
      },
      {
        title: 'com_ui_ux_nav_agentes',
        description: 'com_ui_ux_rail_agentes_desc',
        icon: ManequimIcon,
        iconFilled: ManequimIconFilled,
        id: 'nav-agentes',
        href: '/d/agentes',
      },
      {
        title: 'com_ui_ux_nav_flows',
        description: 'com_ui_ux_rail_flows_desc',
        icon: CarretelIcon,
        iconFilled: CarretelIconFilled,
        id: 'nav-flows',
        href: '/d/flows',
      },
      {
        title: 'com_ui_ux_nav_automacoes',
        description: 'com_ui_ux_rail_automacoes_desc',
        icon: CalendarClock,
        id: 'nav-automacoes',
        href: '/d/automacoes',
      },
      { id: 'sep-1', separator: true, adminOnly: true },
      {
        title: 'com_admin_panel',
        description: 'com_ui_ux_rail_admin_desc',
        icon: ShieldCheck,
        id: 'nav-admin',
        href: '/d/admin',
        adminOnly: true,
      },
    ],
    [],
  );
}
