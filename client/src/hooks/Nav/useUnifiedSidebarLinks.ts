import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { MessageSquare, Image, GitFork, CalendarClock, ShieldCheck } from 'lucide-react';
import { useUserKeyQuery } from 'librechat-data-provider/react-query';
import { getConfigDefaults, getEndpointField } from 'librechat-data-provider';
import type { TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';
import { useGetEndpointsQuery, useGetStartupConfig } from '~/data-provider';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

export default function useUnifiedSidebarLinks() {
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const endpoint = conversation?.endpoint;
  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'type'),
    [endpoint, endpointsConfig],
  );

  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );

  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '');

  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  const sideNavLinks = useSideNavLinks({
    keyProvided,
    endpoint,
    endpointType,
    interfaceConfig,
    endpointsConfig,
    includeHidePanel: false,
  });

  const links = useMemo(() => {
    const conversationLink: NavLink = {
      title: 'com_ui_chat_history',
      label: '',
      icon: MessageSquare,
      id: 'conversations',
      Component: ConversationsSection,
    };

    const destinationLinks: NavLink[] = [
      {
        title: 'com_ui_ux_nav_studio_imagens',
        icon: Image,
        id: 'nav-studio',
        href: '/d/studio',
      },
      {
        title: 'com_ui_ux_nav_flows',
        icon: GitFork,
        id: 'nav-flows',
        href: '/d/agent-studio',
      },
      {
        title: 'com_ui_ux_nav_automacoes',
        icon: CalendarClock,
        id: 'nav-automacoes',
        href: '/d/automacoes',
      },
      { id: 'sep-1', separator: true },
    ];

    const adminGroup: NavLink[] = [
      { id: 'sep-2', separator: true, adminOnly: true },
      {
        title: 'com_admin_panel',
        icon: ShieldCheck,
        id: 'nav-admin',
        href: '/d/admin',
        adminOnly: true,
      },
    ];

    return [
      conversationLink,
      { id: 'sep-0', separator: true },
      ...destinationLinks,
      ...sideNavLinks,
      ...adminGroup,
    ];
  }, [sideNavLinks]);

  return links;
}
