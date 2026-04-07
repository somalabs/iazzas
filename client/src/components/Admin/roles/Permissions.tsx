import { useState, useEffect } from 'react';
import { Switch } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { useGetRole, useUpdateAdminRolePermsMutation } from '~/data-provider';

const CAPABILITY_CATEGORIES = [
  {
    key: 'users',
    label: 'Usuários',
    capabilities: ['manage:users', 'read:users'],
  },
  {
    key: 'groups',
    label: 'Grupos',
    capabilities: ['manage:groups', 'read:groups'],
  },
  {
    key: 'roles',
    label: 'Roles',
    capabilities: ['manage:roles', 'read:roles'],
  },
  {
    key: 'config',
    label: 'Configuração',
    capabilities: ['manage:configs', 'read:configs', 'assign:configs'],
  },
  {
    key: 'content',
    label: 'Conteúdo',
    capabilities: [
      'manage:agents',
      'read:agents',
      'manage:prompts',
      'read:prompts',
      'manage:assistants',
      'read:assistants',
      'manage:mcpservers',
    ],
  },
  {
    key: 'system',
    label: 'Sistema',
    capabilities: ['access:admin', 'read:usage'],
  },
];

interface PermissionsProps {
  roleName: string;
}

export default function Permissions({ roleName }: PermissionsProps) {
  const localize = useLocalize();
  const roleQuery = useGetRole(roleName);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [dirty, setDirty] = useState(false);

  const updateMutation = useUpdateAdminRolePermsMutation({
    onSuccess: () => setDirty(false),
  });

  useEffect(() => {
    if (roleQuery.data?.permissions) {
      setPermissions(roleQuery.data.permissions);
      setDirty(false);
    }
  }, [roleQuery.data]);

  const isCapEnabled = (capability: string): boolean => {
    const [action, resource] = capability.split(':');
    if (!action || !resource) {
      return false;
    }
    return permissions[resource]?.[action] ?? false;
  };

  const toggleCap = (capability: string) => {
    const [action, resource] = capability.split(':');
    if (!action || !resource) {
      return;
    }
    setPermissions((prev) => ({
      ...prev,
      [resource]: {
        ...prev[resource],
        [action]: !isCapEnabled(capability),
      },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate({ name: roleName, permissions });
  };

  const capLabel = (cap: string): string => {
    const parts = cap.split(':');
    const action = parts[0];
    const resource = parts.slice(1).join(':');
    const actionMap: Record<string, string> = {
      manage: 'Gerenciar',
      read: 'Visualizar',
      access: 'Acessar',
      assign: 'Atribuir',
    };
    return `${actionMap[action] ?? action} ${resource}`;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          {localize('com_admin_roles_permissions')}
        </h3>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            className="rounded-lg bg-surface-submit px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {updateMutation.isLoading ? '...' : 'Salvar'}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {CAPABILITY_CATEGORIES.map((category) => (
          <div key={category.key}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              {category.label}
            </h4>
            <div className="space-y-2">
              {category.capabilities.map((cap) => (
                <div
                  key={cap}
                  className="flex items-center justify-between rounded-lg bg-surface-primary px-3 py-2"
                >
                  <span className="text-sm text-text-primary">{capLabel(cap)}</span>
                  <Switch
                    checked={isCapEnabled(cap)}
                    onCheckedChange={() => toggleCap(cap)}
                    aria-label={capLabel(cap)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
