import { useLocalize } from '~/hooks';
import { useStudioContext } from '../context';

export default function AdvancedMode() {
  const localize = useLocalize();
  const { modelOverride, setModelOverride } = useStudioContext();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="studio-model-override" className="text-xs font-medium text-text-secondary">
          {localize('com_studio_model_override')}
        </label>
        <input
          id="studio-model-override"
          type="text"
          value={modelOverride}
          onChange={(e) => setModelOverride(e.target.value)}
          placeholder="e.g. dall-e-3, midjourney-v6"
          className="w-full rounded-lg border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-medium focus:outline-none focus:ring-1 focus:ring-ring-primary"
        />
      </div>
      <p className="text-xs text-text-tertiary">
        {localize('com_studio_advanced_mode')} — full prompt control, no guided fields
      </p>
    </div>
  );
}
