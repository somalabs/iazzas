import { Zap, TriangleAlert } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { useStudio, useGenerateImages } from '../context';
import UseCaseSelector from './UseCaseSelector';
import GuidedForm from './GuidedForm';
import AdvancedMode from './AdvancedMode';
import PromptInput from './PromptInput';
import ReferencesPanel from './ReferencesPanel';
import ImageCount from './ImageCount';
import AspectRatioSelector from './AspectRatioSelector';
import ResolutionSelector from './ResolutionSelector';

export default function Workspace() {
  const localize = useLocalize();
  const { activeSchema, advancedMode, creations } = useStudio();
  const generate = useGenerateImages();

  const isGenerating = creations.some((c) => c.status === 'generating');

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 p-4 pb-0">
        {/* UC selector + advanced toggle */}
        <UseCaseSelector />

        {/* UC description */}
        {activeSchema && (
          <div className="space-y-0.5">
            <h2 className="font-editorial text-lg font-semibold text-text-primary">
              {activeSchema.displayName}
            </h2>
            <p className="text-xs text-text-secondary">{activeSchema.description}</p>
          </div>
        )}

        {/* Human review notice */}
        {activeSchema?.compliance?.requiresHumanReview && (
          <div className="flex items-start gap-2 rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-text-warning" strokeWidth={1.5} />
            {localize('com_studio_review_required')}
          </div>
        )}

        {/* Guided form */}
        {!advancedMode && <GuidedForm />}

        {/* Advanced mode extras */}
        {advancedMode && <AdvancedMode />}

        {/* Prompt */}
        <PromptInput />

        {/* References */}
        <ReferencesPanel />
      </div>

      {/* Bottom toolbar + generate */}
      <div className="sticky bottom-0 border-t border-border-medium bg-surface-primary/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ImageCount />
          <AspectRatioSelector />
          <ResolutionSelector />
          <div className="ml-auto">
            <button
              type="button"
              onClick={generate}
              disabled={isGenerating}
              className="flex items-center gap-2 rounded-lg bg-surface-submit px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-surface-submit-hover disabled:opacity-50"
              aria-label={isGenerating ? localize('com_studio_generating') : localize('com_studio_generate')}
            >
              <Zap className="h-4 w-4" strokeWidth={2} />
              {isGenerating ? localize('com_studio_generating') : localize('com_studio_generate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
