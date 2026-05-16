import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useLocalize } from '~/hooks';
import type { LineageNode } from '../types';

type LineageProps = {
  nodes: LineageNode[];
};

export default function Lineage({ nodes }: LineageProps) {
  const localize = useLocalize();

  const parents = nodes.filter((n) => n.relation === 'created_from');
  const children = nodes.filter((n) => n.relation === 'referenced_by');

  if (nodes.length === 0) return null;

  return (
    <section aria-label={localize('com_studio_lineage')}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-secondary">
        {localize('com_studio_lineage')}
      </h3>
      <div className="flex flex-col gap-3">
        {parents.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {localize('com_studio_lineage_created_from')}
            </p>
            <div className="flex flex-wrap gap-2">
              {parents.map((node) => (
                <button
                  key={node.creationId}
                  type="button"
                  className="group flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-secondary px-2 py-1.5 hover:border-border-medium"
                >
                  <img
                    src={node.url}
                    alt={node.prompt}
                    className="h-6 w-6 rounded object-cover"
                  />
                  <span className="max-w-[100px] truncate text-[10px] text-text-secondary group-hover:text-text-primary">
                    {node.prompt}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-text-tertiary" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {localize('com_studio_lineage_referenced_by')}
            </p>
            <div className="flex flex-wrap gap-2">
              {children.map((node) => (
                <button
                  key={node.creationId}
                  type="button"
                  className="group flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-secondary px-2 py-1.5 hover:border-border-medium"
                >
                  <ArrowDownLeft className="h-3 w-3 text-text-tertiary" aria-hidden="true" />
                  <img
                    src={node.url}
                    alt={node.prompt}
                    className="h-6 w-6 rounded object-cover"
                  />
                  <span className="max-w-[100px] truncate text-[10px] text-text-secondary group-hover:text-text-primary">
                    {node.prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
