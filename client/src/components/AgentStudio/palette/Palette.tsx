import { Zap, Bot, GitBranch, Globe, UserCheck, Flag } from 'lucide-react';
import type { TranslationKeys } from '~/hooks';
import { useLocalize } from '~/hooks';
import PaletteCard from './PaletteCard';
import type { FlowNodeType } from 'librechat-data-provider';

type PaletteItem = {
  nodeType: FlowNodeType;
  labelKey: TranslationKeys;
  descKey: TranslationKeys;
  icon: React.ReactNode;
  accentClass: string;
};

const PALETTE_ITEMS: PaletteItem[] = [
  {
    nodeType: 'trigger',
    labelKey: 'com_studio_flow_node_trigger',
    descKey: 'com_studio_flow_node_trigger_desc',
    icon: <Zap className="h-3.5 w-3.5 text-violet-400" />,
    accentClass: 'bg-violet-500/10',
  },
  {
    nodeType: 'agent',
    labelKey: 'com_studio_flow_node_agent',
    descKey: 'com_studio_flow_node_agent_desc',
    icon: <Bot className="h-3.5 w-3.5 text-blue-400" />,
    accentClass: 'bg-blue-500/10',
  },
  {
    nodeType: 'condition',
    labelKey: 'com_studio_flow_node_condition',
    descKey: 'com_studio_flow_node_condition_desc',
    icon: <GitBranch className="h-3.5 w-3.5 text-amber-400" />,
    accentClass: 'bg-amber-500/10',
  },
  {
    nodeType: 'http',
    labelKey: 'com_studio_flow_node_http',
    descKey: 'com_studio_flow_node_http_desc',
    icon: <Globe className="h-3.5 w-3.5 text-sky-400" />,
    accentClass: 'bg-sky-500/10',
  },
  {
    nodeType: 'human_approval',
    labelKey: 'com_studio_flow_node_human_approval',
    descKey: 'com_studio_flow_node_human_approval_desc',
    icon: <UserCheck className="h-3.5 w-3.5 text-orange-400" />,
    accentClass: 'bg-orange-500/10',
  },
  {
    nodeType: 'output',
    labelKey: 'com_studio_flow_node_output',
    descKey: 'com_studio_flow_node_output_desc',
    icon: <Flag className="h-3.5 w-3.5 text-emerald-400" />,
    accentClass: 'bg-emerald-500/10',
  },
];

export default function Palette() {
  const localize = useLocalize();

  return (
    <aside
      aria-label={localize('com_studio_flow_palette_title')}
      className="flex h-full w-[220px] flex-shrink-0 flex-col gap-1 overflow-y-auto border-r border-border-light bg-surface-secondary p-3"
    >
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {localize('com_studio_flow_palette_title')}
      </p>
      <div className="flex flex-col gap-1.5">
        {PALETTE_ITEMS.map((item) => (
          <PaletteCard
            key={item.nodeType}
            nodeType={item.nodeType}
            label={localize(item.labelKey)}
            description={localize(item.descKey)}
            icon={item.icon}
            accentClass={item.accentClass}
          />
        ))}
      </div>
    </aside>
  );
}
