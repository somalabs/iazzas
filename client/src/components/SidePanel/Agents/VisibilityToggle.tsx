import { useCallback } from 'react';
import { Globe } from 'lucide-react';
import { Switch, Label, useToastContext } from '@librechat/client';
import { useFormContext, useWatch } from 'react-hook-form';
import { ResourceType, AccessRoleIds } from 'librechat-data-provider';
import { useUpdateResourcePermissionsMutation } from 'librechat-data-provider/react-query';
import type { AgentForm } from '~/common';
import { useCanSharePublic } from '~/hooks/Sharing';
import { useLocalize } from '~/hooks';

export default function VisibilityToggle() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const canSharePublic = useCanSharePublic(ResourceType.AGENT);
  const { control, setValue } = useFormContext<AgentForm>();
  const updatePermissionsMutation = useUpdateResourcePermissionsMutation();

  const isPublic = useWatch({ control, name: 'is_public' }) ?? false;
  const agent = useWatch({ control, name: 'agent' });
  const agentDbId = agent && '_id' in agent ? agent._id : undefined;

  const handleToggle = useCallback(
    (next: boolean) => {
      setValue('is_public', next, { shouldDirty: true });

      if (!agentDbId) {
        return;
      }

      updatePermissionsMutation.mutate(
        {
          resourceType: ResourceType.AGENT,
          resourceId: agentDbId,
          data: {
            updated: [],
            removed: [],
            public: next,
            publicAccessRoleId: next ? AccessRoleIds.AGENT_VIEWER : undefined,
          },
        },
        {
          onError: () => {
            setValue('is_public', !next, { shouldDirty: true });
            showToast({
              message: localize('com_ui_permissions_failed_update'),
              status: 'error',
            });
          },
        },
      );
    },
    [agentDbId, setValue, updatePermissionsMutation, showToast, localize],
  );

  if (!canSharePublic) {
    return null;
  }

  return (
    <div className="mb-5 mt-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Globe
          className={isPublic ? 'size-4 text-[var(--azzas-navy)]' : 'size-4 text-text-secondary'}
        />
        <div className="flex flex-col">
          <Label
            htmlFor="agent-visible-marketplace-toggle"
            className="cursor-pointer text-sm font-medium text-text-primary"
          >
            {localize('com_ui_agent_visible_marketplace')}
          </Label>
          <span className="text-xs text-text-secondary">
            {localize('com_ui_agent_visible_marketplace_desc')}
          </span>
        </div>
      </div>
      <Switch
        id="agent-visible-marketplace-toggle"
        checked={isPublic}
        onCheckedChange={handleToggle}
        disabled={updatePermissionsMutation.isLoading}
        aria-label={localize('com_ui_agent_visible_marketplace')}
        className="data-[state=checked]:bg-[var(--azzas-navy)]"
      />
    </div>
  );
}
