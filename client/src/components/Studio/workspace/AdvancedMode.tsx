import type { StudioModel } from 'librechat-data-provider';
import { useLocalize } from '~/hooks';
import { useStudio, useStudioDispatch } from '../context';
import { MODEL_DISPLAY_NAMES } from '../schemas';

const ALL_MODELS = Object.entries(MODEL_DISPLAY_NAMES);

export default function AdvancedMode() {
  const localize = useLocalize();
  const { modelOverride } = useStudio();
  const dispatch = useStudioDispatch();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-medium bg-surface-secondary p-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="studio-model-override"
          className="text-xs font-medium text-text-secondary"
        >
          {localize('com_studio_model_label')}
        </label>
        <select
          id="studio-model-override"
          value={modelOverride ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'SET_MODEL_OVERRIDE',
              payload: e.target.value ? (e.target.value as StudioModel) : null,
            })
          }
          className="rounded-lg border border-border-medium bg-surface-tertiary px-3 py-2 text-sm text-text-primary focus:border-border-heavy focus:outline-none"
        >
          <option value="">{localize('com_studio_model_auto')}</option>
          {ALL_MODELS.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-text-tertiary">
          {localize('com_studio_model_override_help')}
        </span>
      </div>
    </div>
  );
}
