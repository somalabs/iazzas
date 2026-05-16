import { Loader2 } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useStudioContext } from './context';
import UseCaseSelector from './usecase/Selector';
import GuidedForm from './usecase/GuidedForm';
import AdvancedMode from './usecase/AdvancedMode';
import ReferencesPanel from './references/Panel';
import PromptInput from './prompt/Input';
import ImageCount from './controls/ImageCount';
import AspectRatioSelector from './controls/AspectRatio';
import ResolutionSelector from './controls/Resolution';
import ImageDetail from './detail/ImageDetail';

export default function Workspace() {
  const localize = useLocalize();
  const { mode, selectedCreation, isGenerating, prompt } = useStudioContext();

  if (selectedCreation) {
    return <ImageDetail />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 py-5">
        <div className="flex items-center justify-between">
          <h1 className="font-editorial text-xl font-semibold tracking-tight text-text-primary">
            {localize('com_studio_title')}
          </h1>
        </div>

        <UseCaseSelector />

        {mode === 'guided' && <GuidedForm />}
        {mode === 'advanced' && <AdvancedMode />}

        <PromptInput />

        <ReferencesPanel />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ImageCount />
          <AspectRatioSelector />
          <ResolutionSelector />
        </div>

        <GenerateButton />
      </div>
    </div>
  );
}

function GenerateButton() {
  const localize = useLocalize();
  const { isGenerating, prompt } = useStudioContext();

  const isDisabled = isGenerating || !prompt.trim();

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-label={localize('com_studio_generate')}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-submit px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-surface-submit-hover disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {localize('com_studio_generating')}
        </>
      ) : (
        localize('com_studio_generate')
      )}
    </button>
  );
}
