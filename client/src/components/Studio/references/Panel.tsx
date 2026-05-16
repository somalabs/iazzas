import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';
import ReferenceSlotGrid from './Slot';

export default function ReferencesPanel() {
  const localize = useLocalize();
  const { references } = useStudioContext();
  const total = references.length;

  return (
    <section aria-label={localize('com_studio_references')}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-editorial text-sm font-medium text-text-secondary uppercase tracking-widest">
          {localize('com_studio_references')}
        </span>
        <span
          className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-text-tertiary"
          aria-label={`${total} of 8 reference slots used`}
        >
          {localize('com_studio_references_count').replace('{{n}}', String(total))}
        </span>
      </div>
      <ReferenceSlotGrid />
      <p className="mt-1.5 text-[10px] text-text-tertiary">
        {localize('com_studio_slots_hint')}
      </p>
    </section>
  );
}
