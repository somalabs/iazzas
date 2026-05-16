import { useLocalize } from '~/hooks';
import { useStudio, useStudioDispatch } from '../context';
import { MODEL_DISPLAY_NAMES } from '../schemas';

const ALL_MODELS = Object.entries(MODEL_DISPLAY_NAMES);

export default function AdvancedMode() {
  const localize = useLocalize();
  const { activeSchema } = useStudio();
  const dispatch = useStudioDispatch();

  // TODO(tech): wire model override to context; currently reads schema default
  const currentModel = activeSchema?.defaultModel ?? 'nano-banana-pro';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-medium bg-surface-secondary p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-secondary">
          {localize('com_studio_model_label')}
        </label>
        <select
          defaultValue={currentModel}
          className="rounded-lg border border-border-medium bg-surface-tertiary px-3 py-2 text-sm text-text-primary focus:border-border-heavy focus:outline-none"
          disabled
          title="Model override — wired by tech stream"
        >
          {ALL_MODELS.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <span className="text-[11px] text-text-tertiary">
          {/* TODO(tech): enable model override via router */}
          Override do modelo será ativado pelo stream tech.
        </span>
      </div>
    </div>
  );
}
