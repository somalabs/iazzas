import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess } from '~/hooks';

/**
 * Gate de permissão para telas de agentes. Redireciona p/ /c/new após 1s
 * quando o usuário não tem AGENTS.USE. Retorna se tem acesso.
 */
export default function useAgentsAccessRedirect(): boolean {
  const navigate = useNavigate();
  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });

  useEffect(() => {
    if (!hasAccess) {
      const id = setTimeout(() => navigate('/c/new'), 1000);
      return () => clearTimeout(id);
    }
  }, [hasAccess, navigate]);

  return hasAccess;
}
