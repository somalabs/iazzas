import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Compass, Pencil, Copy, Trash2, Bot } from 'lucide-react';

import ScreenHeader from '~/components/ui/ScreenHeader';
import InlineConfirm from '~/components/ui/InlineConfirm';
import { Button, Spinner, useToastContext } from '@librechat/client';
import type { Agent } from 'librechat-data-provider';
import {
  useListAgentsQuery,
  useDeleteAgentMutation,
  useDuplicateAgentMutation,
} from '~/data-provider';
import { useAgentsAccessRedirect, useSelectAgent } from '~/hooks/Agents';
import { useAgentDefaultPermissionLevel, useLocalize } from '~/hooks';
import { renderAgentAvatar } from '~/utils/agents';
import { cn } from '~/utils';

export default function AgentesHome() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const hasAccess = useAgentsAccessRedirect();
  const permissionLevel = useAgentDefaultPermissionLevel();
  const { data: agents } = useListAgentsQuery(
    { requiredPermission: permissionLevel },
    { select: (res) => res.data },
  );
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <ScreenHeader>
        <h1 className="pl-2 text-sm font-semibold text-text-primary">
          {localize('com_ui_ux_nav_agentes')}
        </h1>
      </ScreenHeader>
      <main
        className="min-w-0 flex-1 overflow-y-auto bg-surface-primary"
        aria-label={localize('com_ui_ux_nav_agentes')}
      >
        <div className="mx-auto w-full max-w-6xl px-6 pb-8 pt-[84px] sm:px-8">
          <Header
            onCreate={() => navigate('/d/agentes/novo')}
            onMarketplace={() => navigate('/agents')}
          />
          <AgentsGrid agents={agents ?? null} />
        </div>
      </main>
    </div>
  );
}

function Header({ onCreate, onMarketplace }: { onCreate: () => void; onMarketplace: () => void }) {
  const localize = useLocalize();
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-editorial text-2xl font-medium tracking-[-0.5px] text-text-primary">
          {localize('com_ui_ux_agentes_home_title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {localize('com_ui_ux_agentes_home_subtitle')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onMarketplace}>
          <Compass className="size-4" />
          {localize('com_ui_ux_agentes_home_explore')}
        </Button>
        <Button onClick={onCreate} className="bg-action text-on-action hover:bg-action-hover">
          <Plus className="size-4" />
          {localize('com_ui_ux_agentes_home_create')}
        </Button>
      </div>
    </header>
  );
}

function AgentsGrid({ agents }: { agents: Agent[] | null }) {
  const localize = useLocalize();
  const navigate = useNavigate();

  if (agents == null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6 text-text-secondary" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-medium px-6 py-16 text-center">
        <Bot className="mb-3 size-10 text-text-secondary" />
        <h2 className="text-lg font-medium text-text-primary">
          {localize('com_ui_ux_agentes_home_empty_title')}
        </h2>
        <p className="mt-1 max-w-md text-sm text-text-secondary">
          {localize('com_ui_ux_agentes_home_empty_subtitle')}
        </p>
        <Button className="mt-5" onClick={() => navigate('/d/agentes/novo')}>
          <Plus className="size-4" />
          {localize('com_ui_ux_agentes_home_create_first')}
        </Button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-paper">
      {agents.map((agent, index) => (
        <AgentCard key={agent.id} agent={agent} index={index} />
      ))}
    </div>
  );
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { onSelect } = useSelectAgent();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteAgent = useDeleteAgentMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_agent_deleted'), status: 'success' });
      setConfirmDelete(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_agent_delete_error'), status: 'error' });
    },
  });

  const duplicateAgent = useDuplicateAgentMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_agent_duplicated'), status: 'success' });
    },
    onError: () => {
      showToast({ message: localize('com_ui_agent_duplicate_error'), status: 'error' });
    },
  });

  const openInChat = () => {
    if (agent.id) {
      onSelect(agent.id);
    }
  };

  const goEdit = () => navigate(`/d/agentes/${agent.id}`);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-colors',
        'cursor-pointer hover:bg-surface-tertiary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-1',
        index % 2 === 1 && 'bg-surface-primary',
      )}
      onClick={openInChat}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openInChat();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={localize('com_agents_agent_card_label', {
        name: agent.name ?? '',
        description: agent.description ?? '',
      })}
    >
      <span className="flex shrink-0 overflow-hidden rounded-lg bg-[#27456614]">
        {renderAgentAvatar(agent, { size: 'sm', showBorder: false })}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-ink-900">{agent.name || agent.id}</h3>
        {agent.description ? (
          <p className="truncate text-xs text-ink-700">{agent.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {confirmDelete ? (
          <InlineConfirm
            message={localize('com_ui_delete_agent_confirm')}
            cancelLabel={localize('com_ui_cancel')}
            confirmLabel={localize('com_ui_delete')}
            loading={deleteAgent.isLoading}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => deleteAgent.mutate({ agent_id: agent.id ?? '' })}
          />
        ) : (
          <>
            <RowAction icon={Pencil} label={localize('com_ui_edit')} onClick={goEdit} />
            <RowAction
              icon={Copy}
              label={localize('com_ui_duplicate')}
              onClick={() => duplicateAgent.mutate({ agent_id: agent.id ?? '' })}
            />
            <RowAction
              icon={Trash2}
              label={localize('com_ui_delete')}
              danger
              onClick={() => setConfirmDelete(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RowAction({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex size-7 items-center justify-center rounded-md text-ink-700 transition-colors',
        danger
          ? 'hover:bg-[#c25a3c1a] hover:text-ember'
          : 'hover:bg-surface-tertiary hover:text-ink-900',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
