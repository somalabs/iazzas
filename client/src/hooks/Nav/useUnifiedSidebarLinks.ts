import { useMemo } from 'react';
import { ShieldCheck, MessageSquare, Sparkles, Bot, GitBranch, Zap, Megaphone } from 'lucide-react';
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
        icon: Sparkles,
        id: 'nav-studio',
        href: '/d/studio',
      },
      {
        title: 'com_ui_ux_nav_agentes',
        description: 'com_ui_ux_rail_agentes_desc',
        icon: Bot,
        id: 'nav-agentes',
        href: '/d/agentes',
      },
      {
        title: 'com_ui_ux_nav_flows',
        description: 'com_ui_ux_rail_flows_desc',
        icon: GitBranch,
        id: 'nav-flows',
        href: '/d/flows',
      },
      {
        title: 'com_ui_ux_nav_automacoes',
        description: 'com_ui_ux_rail_automacoes_desc',
        icon: Zap,
        id: 'nav-automacoes',
        href: '/d/automacoes',
      },
      {
        title: 'com_recados_nav',
        description: 'com_recados_nav_desc',
        icon: Megaphone,
        id: 'nav-recados',
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
