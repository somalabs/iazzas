import { useMemo } from 'react';
import { MCPIcon } from '@librechat/client';
import type { MCPServerDefinition } from '~/hooks/MCP/useMCPServerManager';
import { getSelectedServerIcons } from './mcpServerUtils';
import { cn } from '~/utils';

interface StackedMCPIconsProps {
  selectedServers: MCPServerDefinition[];
  maxIcons?: number;
  iconSize?: 'sm' | 'md';
  variant?: 'default' | 'submenu';
}

const sizeConfig = {
  sm: {
    icon: 'h-[18px] w-[18px]',
    container: 'h-[22px] w-[22px]',
    overlap: '-ml-2',
  },
  md: {
    icon: 'h-5 w-5',
    container: 'h-6 w-6',
    overlap: '-ml-2.5',
  },
};

const variantConfig = {
  default: {
    border: 'border-border-medium',
    bg: 'bg-surface-secondary',
    ring: 'ring-2 ring-presentation',
  },
  submenu: {
    border: 'border-surface-primary',
    bg: 'bg-surface-primary',
    ring: 'ring-2 ring-surface-primary',
  },
};

export default function StackedMCPIcons({
  selectedServers,
  maxIcons = 3,
  iconSize = 'md',
  variant = 'default',
}: StackedMCPIconsProps) {
  const { icons, overflowCount } = useMemo(
    () => getSelectedServerIcons(selectedServers, maxIcons),
    [selectedServers, maxIcons],
  );

  if (icons.length === 0) {
    return (
      <MCPIcon
        aria-hidden="true"
        className={cn('flex-shrink-0 text-text-primary', sizeConfig.md.icon)}
      />
    );
  }

  const sizes = sizeConfig[iconSize];
  const colors = variantConfig[variant];

  return (
    <div className="flex items-center" aria-hidden="true">
      {icons.map((icon, index) => (
        <div
          key={icon.key}
          title={icon.displayName}
          className={cn(
            'relative flex items-center justify-center rounded-full border',
            colors.border,
            colors.bg,
            colors.ring,
            sizes.container,
            index > 0 && sizes.overlap,
          )}
          style={{ zIndex: icons.length - index }}
        >
          {icon.iconPath ? (
            <img
              src={icon.iconPath}
              alt={icon.displayName}
              className={cn('rounded-full object-cover', sizes.icon)}
            />
          ) : (
            <MCPIcon className={cn('text-text-primary', sizes.icon)} />
          )}
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full bg-surface-tertiary text-[11px] font-semibold text-text-secondary md:hidden',
            colors.ring,
            sizes.container,
            sizes.overlap,
          )}
          style={{ zIndex: 0 }}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
