import { memo, useCallback, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { QueryKeys, SystemRoles } from 'librechat-data-provider';
import { Skeleton, Sidebar, Button, TooltipAnchor, NewChatIcon } from '@librechat/client';
import type { NavLink } from '~/common';
import { CLOSE_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import { useLocalize, useNewConvo } from '~/hooks';
import { useAuthContext } from '~/hooks/AuthContext';
import { clearMessagesCache, cn } from '~/utils';
import store from '~/store';

const BalanceWidget = lazy(() => import('~/components/Nav/BalanceWidget'));
const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

const ROW_BASE =
  'flex w-full items-center rounded-lg text-left transition-colors hover:bg-surface-hover';
const ROW_EXPANDED = 'h-auto justify-start gap-3 px-2 py-2';
const ROW_COLLAPSED = 'h-9 w-9 justify-center p-0';
const ICON_SLOT = 'flex h-6 w-6 flex-shrink-0 items-center justify-center';

const NewChatButton = memo(function NewChatButton({ expanded }: { expanded: boolean }) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useRecoilValue(store.conversationByIndex(0));

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
        return;
      }
      e.preventDefault();
      clearMessagesCache(queryClient, conversation?.conversationId);
      queryClient.invalidateQueries([QueryKeys.messages]);
      newConversation();
    },
    [queryClient, conversation?.conversationId, newConversation],
  );

  const label = localize('com_ui_new_chat');

  return (
    <TooltipAnchor
      side="right"
      description={expanded ? '' : label}
      render={
        <a
          href="/c/new"
          data-testid="new-chat-button"
          aria-label={label}
          className={cn(ROW_BASE, expanded ? ROW_EXPANDED : ROW_COLLAPSED)}
          onClick={handleClick}
        >
          <span className={ICON_SLOT}>
            <span className="flex size-6 items-center justify-center rounded-full bg-text-primary">
              <NewChatIcon className="size-3.5 text-white dark:text-black" />
            </span>
          </span>
          {expanded && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-text-primary">{label}</span>
              <span className="truncate text-xs text-text-secondary">
                {localize('com_ui_ux_rail_novo_chat_desc')}
              </span>
            </span>
          )}
        </a>
      }
    />
  );
});

const NavRouteButton = memo(function NavRouteButton({
  link,
  expanded,
}: {
  link: NavLink;
  expanded: boolean;
}) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const location = useLocation();
  const isNavActive = link.href ? location.pathname.startsWith(link.href) : false;
  const label = link.title ? localize(link.title) : '';

  return (
    <TooltipAnchor
      description={expanded ? '' : label}
      side="right"
      render={
        <Button
          variant="ghost"
          aria-label={label}
          aria-current={isNavActive ? 'page' : undefined}
          className={cn(
            ROW_BASE,
            expanded ? ROW_EXPANDED : ROW_COLLAPSED,
            isNavActive
              ? 'bg-surface-active-alt text-text-primary'
              : 'text-text-secondary hover:bg-surface-hover',
          )}
          onClick={() => navigate(link.href!)}
        >
          <span className={ICON_SLOT}>
            {link.icon && <link.icon className="h-5 w-5" aria-hidden="true" />}
          </span>
          {expanded && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-text-primary">{label}</span>
              {link.description && (
                <span className="truncate text-xs text-text-secondary">
                  {localize(link.description)}
                </span>
              )}
            </span>
          )}
        </Button>
      }
    />
  );
});

function ExpandedPanel({
  links,
  expanded = true,
  onToggle,
}: {
  links: NavLink[];
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const isAdmin = user?.role === SystemRoles.ADMIN;

  const toggleLabel = expanded ? 'com_nav_close_sidebar' : 'com_nav_open_sidebar';

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col gap-2 border-r border-border-light bg-surface-primary-alt px-2 py-2">
      <TooltipAnchor
        side="right"
        description={expanded ? '' : localize(toggleLabel)}
        render={
          <Button
            id={expanded ? CLOSE_SIDEBAR_ID : undefined}
            data-testid={expanded ? 'close-sidebar-button' : 'open-sidebar-button'}
            variant="ghost"
            aria-label={localize(toggleLabel)}
            aria-expanded={expanded}
            className={cn(ROW_BASE, expanded ? ROW_EXPANDED : ROW_COLLAPSED)}
            onClick={onToggle}
          >
            <span className={ICON_SLOT}>
              <Sidebar aria-hidden="true" className="h-5 w-5 text-text-primary" />
            </span>
          </Button>
        }
      />
      <NewChatButton expanded={expanded} />
      <div className="flex flex-col gap-1 overflow-y-auto">
        {links.map((link) => {
          if (link.adminOnly && !isAdmin) {
            return null;
          }
          if (link.separator) {
            return (
              <div
                key={link.id}
                role="separator"
                aria-hidden="true"
                className="mx-1.5 my-1 h-px bg-border-light"
              />
            );
          }
          return <NavRouteButton key={link.id} link={link} expanded={expanded} />;
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        <Suspense fallback={null}>
          <BalanceWidget collapsed={!expanded} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-9 w-9 rounded-lg" />}>
          <AccountSettings collapsed={!expanded} />
        </Suspense>
      </div>
    </div>
  );
}

export default memo(ExpandedPanel);
