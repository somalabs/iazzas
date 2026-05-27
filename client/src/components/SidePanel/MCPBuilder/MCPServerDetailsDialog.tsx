import {
  MCPIcon,
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
} from '@librechat/client';
import type { MCPServerStatusIconProps } from '~/components/MCP/MCPServerStatusIcon';
import type { MCPServerDefinition } from '~/hooks';
import { getStatusDotColor } from './MCPStatusBadge';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface MCPServerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: MCPServerDefinition;
  statusIconProps: MCPServerStatusIconProps;
}

export default function MCPServerDetailsDialog({
  open,
  onOpenChange,
  server,
  statusIconProps,
}: MCPServerDetailsDialogProps) {
  const localize = useLocalize();
  const { serverStatus, isInitializing } = statusIconProps;

  const displayName = server.config?.title || server.serverName;
  const description = server.config?.description;
  const iconPath = server.config?.iconPath;
  const statusDotColor = getStatusDotColor(serverStatus, isInitializing);

  const statusText = (() => {
    if (isInitializing) return localize('com_nav_mcp_status_initializing');
    if (!serverStatus) return localize('com_nav_mcp_status_unknown');
    const { connectionState, requiresOAuth } = serverStatus;
    if (connectionState === 'connected') return localize('com_nav_mcp_status_connected');
    if (connectionState === 'connecting') return localize('com_nav_mcp_status_connecting');
    if (connectionState === 'error') return localize('com_nav_mcp_status_error');
    if (connectionState === 'disconnected') {
      return requiresOAuth
        ? localize('com_nav_mcp_status_needs_auth')
        : localize('com_nav_mcp_status_disconnected');
    }
    return localize('com_nav_mcp_status_unknown');
  })();

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-lg p-0">
        <OGDialogHeader className="border-b border-border-light px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              {iconPath ? (
                <img
                  src={iconPath}
                  className="size-10 rounded-lg object-cover"
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-lg bg-surface-tertiary">
                  <MCPIcon className="size-6 text-text-secondary" aria-hidden="true" />
                </div>
              )}
              <div
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 size-3 rounded-full',
                  'border-2 border-surface-primary',
                  statusDotColor,
                )}
                aria-hidden="true"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <OGDialogTitle className="truncate text-base font-semibold text-text-primary">
                {displayName}
              </OGDialogTitle>
              <span className="text-xs text-text-secondary">{statusText}</span>
            </div>
          </div>
        </OGDialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {description ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-primary">
              {description}
            </p>
          ) : (
            <p className="text-sm italic text-text-tertiary">
              {localize('com_ui_mcp_no_description')}
            </p>
          )}
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
