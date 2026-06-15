/* eslint-disable i18next/no-literal-string -- intentional hardcoded pt-BR/brand/demo copy in IAzzas fork */
import { memo, lazy, Suspense, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { SystemRoles } from 'librechat-data-provider';
import { PanelLeft } from 'lucide-react';
import { Skeleton, Button, TooltipAnchor } from '@librechat/client';
import type { NavLink } from '~/common';
import { CLOSE_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import { useRecados } from '~/components/Recados';
import { useGoToNewChat, useLocalize } from '~/hooks';
import { useAuthContext } from '~/hooks/AuthContext';
import { cn } from '~/utils';
import store from '~/store';

const BalanceWidget = lazy(() => import('~/components/Nav/BalanceWidget'));
const AccountSettings = lazy(() => import('~/components/Nav/AccountSettings'));

const ROW_BASE = 'group flex w-full items-center rounded-lg text-left transition-colors';
const ROW_EXPANDED = 'h-auto justify-start gap-3 px-2 py-2';
const ROW_COLLAPSED = 'h-9 w-9 justify-center p-0 hover:bg-surface-hover';
const ICON_SLOT = 'flex h-6 w-6 flex-shrink-0 items-center justify-center';
const ICON_HIGHLIGHT_EXPANDED = 'rounded-md transition-colors group-hover:bg-surface-hover h-8 w-8';
// Terracota left marker (3px) + creme plate for the active nav item.
// F2: o marcador entra deslizando da esquerda (before:animate-marker-in).
const ACTIVE_MARKER =
  "relative bg-canvas text-action before:absolute before:content-[''] before:left-0 before:top-[15%] before:bottom-[15%] before:w-[3px] before:rounded-r-full before:bg-ember before:animate-marker-in";

const NavRouteButton = memo(function NavRouteButton({
  link,
  expanded,
  onClickOverride,
  badge = 0,
}: {
  link: NavLink;
  expanded: boolean;
  onClickOverride?: () => void;
  badge?: number;
}) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const location = useLocation();
  const isNavActive = link.href ? location.pathname.startsWith(link.href) : false;
  const label = link.title ? localize(link.title) : '';

  const handleClick = useCallback(() => {
    if (onClickOverride) {
      onClickOverride();
      return;
    }
    navigate(link.href!);
  }, [onClickOverride, navigate, link.href]);

  const IconComponent = isNavActive && link.iconFilled ? link.iconFilled : link.icon;
  const badgeLabel = badge > 99 ? '99+' : `${badge}`;

  const element = (
    <Button
      variant="ghost"
      aria-label={badge > 0 ? `${label} (${badge})` : label}
      aria-current={isNavActive ? 'page' : undefined}
      data-testid={link.id}
      className={cn(
        ROW_BASE,
        expanded ? ROW_EXPANDED : ROW_COLLAPSED,
        !isNavActive && expanded && 'hover:!bg-transparent',
        isNavActive ? ACTIVE_MARKER : 'text-text-secondary',
      )}
      onClick={handleClick}
    >
      <span className={cn(ICON_SLOT, expanded && ICON_HIGHLIGHT_EXPANDED, 'relative')}>
        {IconComponent && <IconComponent className="h-5 w-5" aria-hidden="true" />}
        {badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        )}
      </span>
      {expanded && (
        <span className="min-w-0 truncate text-sm font-medium text-text-primary">{label}</span>
      )}
    </Button>
  );

  if (expanded) {
    return element;
  }
  return <TooltipAnchor side="right" description={label} render={element} />;
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
  const onNavChats = useGoToNewChat();
  const setRecadosOpen = useSetRecoilState(store.recadosInboxOpen);
  const { unreadCount } = useRecados();
  const openRecados = useCallback(() => setRecadosOpen(true), [setRecadosOpen]);

  const toggleLabel = expanded ? 'com_nav_close_sidebar' : 'com_nav_open_sidebar';

  const steelToggle = (
    <button
      type="button"
      id={expanded ? CLOSE_SIDEBAR_ID : undefined}
      data-testid={expanded ? 'close-sidebar-button' : 'open-sidebar-button'}
      aria-label={localize(toggleLabel)}
      aria-expanded={expanded}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      onClick={onToggle}
    >
      <PanelLeft aria-hidden="true" className="h-5 w-5" />
    </button>
  );

  return (
    <div className="flex h-full w-full flex-shrink-0 flex-col border-r border-border-light">
      {/* Paper-white brand band with navy wordmark + steel tagline */}
      <div className="flex h-[52px] flex-shrink-0 items-center border-b border-rule bg-paper px-3">
        {expanded ? (
          <>
            <div className="flex flex-col gap-0.5">
              <img
                src="assets/azzas-logo-navy.svg"
                alt="Azzas 2154"
                className="h-[18px] w-auto dark:hidden"
              />
              <img
                src="assets/azzas-logo-dark.svg"
                alt="Azzas 2154"
                className="hidden h-[18px] w-auto dark:block"
              />
              <span className="font-editorial text-[10px] italic leading-none text-ink-700">
                Fashion &amp; Lifestyle
              </span>
            </div>
            <div className="ml-auto">{steelToggle}</div>
          </>
        ) : (
          <TooltipAnchor side="right" description={localize(toggleLabel)} render={steelToggle} />
        )}
      </div>

      {/* Nav body */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto bg-paper px-2 py-2">
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
          const overrides: Record<string, () => void> = {
            'nav-chats': onNavChats,
            'nav-recados': openRecados,
          };
          const onClickOverride = overrides[link.id];
          return (
            <NavRouteButton
              key={link.id}
              link={link}
              expanded={expanded}
              onClickOverride={onClickOverride}
              badge={link.id === 'nav-recados' ? unreadCount : 0}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-border-light bg-paper px-2 py-2">
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
