import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workflow, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import type { Flow } from 'librechat-data-provider';
import { useFlowsQuery, useDeleteFlowMutation } from '~/data-provider';
import { useAgentsAccessRedirect } from '~/hooks/Agents';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function FlowsHome() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const hasAccess = useAgentsAccessRedirect();
  const { data: flowsData, isLoading } = useFlowsQuery();
  const flows = flowsData?.flows ?? null;

  if (!hasAccess) {
    return null;
  }

  return (
    <main
      className="h-full w-full overflow-y-auto bg-surface-primary"
      aria-label={localize('com_ui_ux_nav_flows')}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8">
        <Header onCreate={() => navigate('/d/flows/novo')} />
        <FlowsGrid flows={isLoading ? null : flows} />
      </div>
    </main>
  );
}

function Header({ onCreate }: { onCreate: () => void }) {
  const localize = useLocalize();
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {localize('com_ui_ux_flows_home_title')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {localize('com_ui_ux_flows_home_subtitle')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onCreate}>
          <Plus className="size-4" />
          {localize('com_ui_ux_flows_home_create')}
        </Button>
      </div>
    </header>
  );
}

function FlowsGrid({ flows }: { flows: Flow[] | null }) {
  const localize = useLocalize();
  const navigate = useNavigate();

  if (flows == null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-6 text-text-secondary" />
      </div>
    );
  }

  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-medium px-6 py-16 text-center">
        <Workflow className="mb-3 size-10 text-text-secondary" />
        <h2 className="text-lg font-medium text-text-primary">
          {localize('com_ui_ux_flows_home_empty_title')}
        </h2>
        <p className="mt-1 max-w-md text-sm text-text-secondary">
          {localize('com_ui_ux_flows_home_empty_subtitle')}
        </p>
        <Button className="mt-5" onClick={() => navigate('/d/flows/novo')}>
          <Plus className="size-4" />
          {localize('com_ui_ux_flows_home_create_first')}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {flows.map((flow) => (
        <FlowCard key={flow._id} flow={flow} />
      ))}
    </div>
  );
}

function FlowCard({ flow }: { flow: Flow }) {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteFlow = useDeleteFlowMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_ux_flows_home_delete_success'), status: 'success' });
      setDeleteOpen(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_ux_flows_home_delete_error'), status: 'error' });
    },
  });

  const open = () => navigate(`/d/flows/${flow._id}`);

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border-light bg-surface-secondary p-4',
        'cursor-pointer transition-colors hover:border-border-medium hover:bg-surface-tertiary',
      )}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={flow.name}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-tertiary text-text-secondary">
          <Workflow className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-text-primary">{flow.name}</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            {flow.nodes?.length ?? 0} {localize('com_ui_ux_flows_home_card_nodes')}
          </p>
        </div>
        <CardMenu onEdit={open} onDelete={() => setDeleteOpen(true)} />
      </div>

      <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <OGDialogTemplate
          showCloseButton={false}
          title={localize('com_ui_ux_flows_home_delete_title')}
          className="max-w-[450px]"
          main={
            <div className="text-sm text-text-secondary">
              {localize('com_ui_ux_flows_home_delete_confirm')}
            </div>
          }
          selection={{
            selectHandler: () => deleteFlow.mutate({ id: flow._id }),
            selectClasses: 'bg-red-500 hover:bg-red-600 text-white',
            selectText: localize('com_ui_delete'),
          }}
        />
      </OGDialog>
    </article>
  );
}

function CardMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const localize = useLocalize();
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const items = useMemo(
    () => [
      { label: localize('com_ui_edit'), icon: Pencil, onClick: onEdit },
      { label: localize('com_ui_delete'), icon: Trash2, onClick: onDelete, destructive: true },
    ],
    [localize, onEdit, onDelete],
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
