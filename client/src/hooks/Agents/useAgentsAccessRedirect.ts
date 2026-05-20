import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import { useHasAccess } from '~/hooks';
import { AuthContext } from '~/hooks/AuthContext';

/**
 * Gate de permissão para telas de agentes. Redireciona p/ /c/new após 1s
 * quando o usuário está autenticado, com roles carregados, mas sem AGENTS.USE.
 * Não redireciona enquanto auth ou roles ainda estão carregando.
 */
export default function useAgentsAccessRedirect(): boolean {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const userRoleName = authContext?.user?.role;
  const roles = authContext?.roles;
  const hasAccess = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });

  // Only redirect once auth AND the user's role data are fully loaded.
  const rolesReady =
    isAuthenticated && userRoleName != null && roles != null && roles[userRoleName] != null;

  useEffect(() => {
    if (rolesReady && !hasAccess) {
      const id = setTimeout(() => navigate('/c/new'), 1000);
      return () => clearTimeout(id);
    }
  }, [rolesReady, hasAccess, navigate]);

  return hasAccess;
}
