import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult, UseMutationOptions } from '@tanstack/react-query';
import type {
  TError,
  AdminRoleResponse,
  AdminGroupResponse,
  AdminGrantResponse,
  AdminConfigResponse,
  AdminAdjustBalanceResponse,
} from 'librechat-data-provider';

type MutOpts<TData, TVars> = UseMutationOptions<TData, TError, TVars>;

/* Roles */

export const useCreateAdminRoleMutation = (
  options?: MutOpts<AdminRoleResponse, { name: string; description?: string }>,
): UseMutationResult<AdminRoleResponse, TError, { name: string; description?: string }> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.createAdminRole(vars), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.rolesList]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useUpdateAdminRoleMutation = (
  options?: MutOpts<
    AdminRoleResponse,
    { currentName: string; body: { name?: string; description?: string } }
  >,
): UseMutationResult<
  AdminRoleResponse,
  TError,
  { currentName: string; body: { name?: string; description?: string } }
> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.updateAdminRole(vars.currentName, vars.body), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.rolesList]);
      queryClient.invalidateQueries([QueryKeys.roles, vars.currentName]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useDeleteAdminRoleMutation = (
  options?: MutOpts<{ success: boolean }, string>,
): UseMutationResult<{ success: boolean }, TError, string> => {
  const queryClient = useQueryClient();
  return useMutation((name) => dataService.deleteAdminRole(name), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.rolesList]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useUpdateAdminRolePermsMutation = (
  options?: MutOpts<
    AdminRoleResponse,
    { name: string; permissions: Record<string, Record<string, boolean>> }
  >,
): UseMutationResult<
  AdminRoleResponse,
  TError,
  { name: string; permissions: Record<string, Record<string, boolean>> }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    (vars) => dataService.updateAdminRolePermissions(vars.name, vars.permissions),
    {
      ...options,
      onSuccess: (data, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.roles, vars.name]);
        options?.onSuccess?.(data, vars, ctx);
      },
    },
  );
};

export const useAddAdminRoleMemberMutation = (
  options?: MutOpts<{ success: boolean }, { name: string; userId: string }>,
): UseMutationResult<{ success: boolean }, TError, { name: string; userId: string }> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.addAdminRoleMember(vars.name, vars.userId), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminRoleMembers, vars.name]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useRemoveAdminRoleMemberMutation = (
  options?: MutOpts<{ success: boolean }, { name: string; userId: string }>,
): UseMutationResult<{ success: boolean }, TError, { name: string; userId: string }> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.removeAdminRoleMember(vars.name, vars.userId), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminRoleMembers, vars.name]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

/* Groups */

export const useCreateAdminGroupMutation = (
  options?: MutOpts<
    AdminGroupResponse,
    { name: string; description?: string; email?: string; memberIds?: string[] }
  >,
): UseMutationResult<
  AdminGroupResponse,
  TError,
  { name: string; description?: string; email?: string; memberIds?: string[] }
> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.createAdminGroup(vars), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminGroups]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useUpdateAdminGroupMutation = (
  options?: MutOpts<
    AdminGroupResponse,
    { id: string; body: { name?: string; description?: string; email?: string } }
  >,
): UseMutationResult<
  AdminGroupResponse,
  TError,
  { id: string; body: { name?: string; description?: string; email?: string } }
> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.updateAdminGroup(vars.id, vars.body), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminGroups]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useDeleteAdminGroupMutation = (
  options?: MutOpts<{ success: boolean; id: string }, string>,
): UseMutationResult<{ success: boolean; id: string }, TError, string> => {
  const queryClient = useQueryClient();
  return useMutation((id) => dataService.deleteAdminGroup(id), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminGroups]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useAddAdminGroupMemberMutation = (
  options?: MutOpts<AdminGroupResponse, { id: string; userId: string }>,
): UseMutationResult<AdminGroupResponse, TError, { id: string; userId: string }> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.addAdminGroupMember(vars.id, vars.userId), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminGroupMembers, vars.id]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useRemoveAdminGroupMemberMutation = (
  options?: MutOpts<{ success: boolean }, { id: string; userId: string }>,
): UseMutationResult<{ success: boolean }, TError, { id: string; userId: string }> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.removeAdminGroupMember(vars.id, vars.userId), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminGroupMembers, vars.id]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

/* Grants */

export const useAssignAdminGrantMutation = (
  options?: MutOpts<
    AdminGrantResponse,
    { principalType: string; principalId: string; capability: string }
  >,
): UseMutationResult<
  AdminGrantResponse,
  TError,
  { principalType: string; principalId: string; capability: string }
> => {
  const queryClient = useQueryClient();
  return useMutation((vars) => dataService.assignAdminGrant(vars), {
    ...options,
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries([QueryKeys.adminGrants]);
      options?.onSuccess?.(data, vars, ctx);
    },
  });
};

export const useRevokeAdminGrantMutation = (
  options?: MutOpts<
    { success: boolean },
    { principalType: string; principalId: string; capability: string }
  >,
): UseMutationResult<
  { success: boolean },
  TError,
  { principalType: string; principalId: string; capability: string }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    (vars) => dataService.revokeAdminGrant(vars.principalType, vars.principalId, vars.capability),
    {
      ...options,
      onSuccess: (data, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.adminGrants]);
        options?.onSuccess?.(data, vars, ctx);
      },
    },
  );
};

/* Config */

export const useUpsertAdminConfigMutation = (
  options?: MutOpts<
    AdminConfigResponse,
    {
      principalType: string;
      principalId: string;
      body: { overrides: Record<string, unknown>; priority?: number };
    }
  >,
): UseMutationResult<
  AdminConfigResponse,
  TError,
  {
    principalType: string;
    principalId: string;
    body: { overrides: Record<string, unknown>; priority?: number };
  }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    (vars) =>
      dataService.upsertAdminPrincipalConfig(vars.principalType, vars.principalId, vars.body),
    {
      ...options,
      onSuccess: (data, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.adminConfigs]);
        options?.onSuccess?.(data, vars, ctx);
      },
    },
  );
};

export const useDeleteAdminConfigMutation = (
  options?: MutOpts<
    { success: boolean },
    { principalType: string; principalId: string }
  >,
): UseMutationResult<
  { success: boolean },
  TError,
  { principalType: string; principalId: string }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    (vars) => dataService.deleteAdminPrincipalConfig(vars.principalType, vars.principalId),
    {
      ...options,
      onSuccess: (data, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.adminConfigs]);
        options?.onSuccess?.(data, vars, ctx);
      },
    },
  );
};

export const useToggleAdminConfigMutation = (
  options?: MutOpts<
    AdminConfigResponse,
    { principalType: string; principalId: string; isActive: boolean }
  >,
): UseMutationResult<
  AdminConfigResponse,
  TError,
  { principalType: string; principalId: string; isActive: boolean }
> => {
  const queryClient = useQueryClient();
  return useMutation(
    (vars) =>
      dataService.toggleAdminPrincipalConfig(vars.principalType, vars.principalId, vars.isActive),
    {
      ...options,
      onSuccess: (data, vars, ctx) => {
        queryClient.invalidateQueries([QueryKeys.adminConfigs]);
        options?.onSuccess?.(data, vars, ctx);
      },
    },
  );
};

export const useAdjustAdminUserBalanceMutation = (
  options?: UseMutationOptions<
    AdminAdjustBalanceResponse,
    Error,
    { userId: string; amount: number; reason: string }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation(
    [MutationKeys.adjustAdminUserBalance],
    ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      dataService.adjustAdminUserBalance(userId, { amount, reason }),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries([QueryKeys.adminUserUsage, variables.userId]);
        queryClient.invalidateQueries([QueryKeys.adminUsers]);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};
