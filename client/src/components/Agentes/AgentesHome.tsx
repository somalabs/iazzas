import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Compass, MoreHorizontal, Pencil, Copy, Trash2 } from 'lucide-react';
import AtelierDrawer from '~/components/ui/AtelierDrawer';
import AtelierTrigger from '~/components/ui/AtelierTrigger';
import {
  Button,
  Spinner,
  useToastContext,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  OGDialog,
  OGDialogTemplate,
} from '@librechat/client';
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
  const [atelierOpen, setAtelierOpen] = useState(false);

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <main
        className="min-w-0 flex-1 overflow-y-auto bg-surface-primary"
        aria-label={localize('com_ui_ux_nav_agentes')}
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8">
          <Header
            onCreate={() => navigate('/d/agentes/novo')}
            onMarketplace={() => navigate('/agents')}
            atelierOpen={atelierOpen}
            onToggleAtelier={() => setAtelierOpen((prev) => !prev)}
          />
          <AgentsGrid agents={agents ?? null} />
        </div>
      </main>

      <AtelierDrawer
        open={atelierOpen}
        title={localize('com_ui_atelier')}
        onClose={() => setAtelierOpen(false)}
      >
        <p className="text-xs text-text-tertiary">{localize('com_ui_atelier_empty')}</p>
      </AtelierDrawer>
    </div>
  );
}

function Header({
  onCreate,
  onMarketplace,
  atelierOpen,
  onToggleAtelier,
}: {
  onCreate: () => void;
  onMarketplace: () => void;
  atelierOpen: boolean;
  onToggleAtelier: () => void;
}) {
  const localize = useLocalize();
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
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
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          {localize('com_ui_ux_agentes_home_create')}
        </Button>
        <AtelierTrigger open={atelierOpen} onToggle={onToggleAtelier} />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { onSelect } = useSelectAgent();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteAgent = useDeleteAgentMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_agent_deleted'), status: 'success' });
      setDeleteOpen(false);
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
        'group relative flex flex-col gap-3 rounded-xl border border-border-light bg-surface-secondary p-4',
        'cursor-pointer transition-colors hover:border-border-medium hover:bg-surface-tertiary',
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
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          {renderAgentAvatar(agent, { size: 'sm', showBorder: false })}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-text-primary">
            {agent.name || agent.id}
          </h3>
          {agent.description ? (
            <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{agent.description}</p>
          ) : null}
        </div>
        <CardMenu
          onEdit={goEdit}
          onDuplicate={() => duplicateAgent.mutate({ agent_id: agent.id ?? '' })}
          onDelete={() => setDeleteOpen(true)}
        />
      </div>

      <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <OGDialogTemplate
          showCloseButton={false}
          title={localize('com_ui_delete_agent')}
          className="max-w-[450px]"
          main={
            <div className="text-sm text-text-secondary">
              {localize('com_ui_delete_agent_confirm')}
            </div>
          }
          selection={{
            selectHandler: () => deleteAgent.mutate({ agent_id: agent.id ?? '' }),
            selectClasses: 'bg-red-500 hover:bg-red-600 text-white',
            selectText: localize('com_ui_delete'),
          }}
        />
      </OGDialog>
    </div>
  );
}

function CardMenu({
  onEdit,
  onDuplicate,
  onDelete,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const localize = useLocalize();
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const items = useMemo(
    () => [
      { label: localize('com_ui_edit'), icon: Pencil, onClick: onEdit },
      { label: localize('com_ui_duplicate'), icon: Copy, onClick: onDuplicate },
      { label: localize('com_ui_delete'), icon: Trash2, onClick: onDelete, destructive: true },
    ],
    [localize, onEdit, onDuplicate, onDelete],
  );

  return (
    <div onClick={stop}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            aria-label={localize('com_ui_more_options')}
            className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {items.map((item) => (
            <DropdownMenuItem
              key={item.label}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
              }}
              className={cn(item.destructive && 'text-red-500 focus:text-red-500')}
            >
              <item.icon className="mr-2 size-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
