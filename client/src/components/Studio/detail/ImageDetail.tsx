import { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronDown,
  Heart,
  Wand2,
  Copy,
  RefreshCw,
  Camera,
  ArrowUpCircle,
  Sparkles,
  Box,
  Layers,
} from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import { useStudioContext } from '../context';
import InlineEditor from '../editor/InlineEditor';
import Lineage from './Lineage';

const USE_IMAGE_ACTIONS = [
  { key: 'use_style', labelKey: 'com_studio_use_as_style', icon: Sparkles },
  { key: 'use_ref', labelKey: 'com_studio_use_as_reference', icon: Copy },
  { key: 'recreate', labelKey: 'com_studio_recreate', icon: RefreshCw },
  { key: 'variations', labelKey: 'com_studio_variations', icon: Wand2 },
  { key: 'camera', labelKey: 'com_studio_camera_change', icon: Camera },
  { key: 'upscale', labelKey: 'com_studio_upscale', icon: ArrowUpCircle },
  { key: 'skin', labelKey: 'com_studio_skin_enhancer', icon: Sparkles },
  { key: '3d', labelKey: 'com_studio_3d_model', icon: Box },
  { key: '3d_scene', labelKey: 'com_studio_create_3d_scene', icon: Layers },
] as const;

export default function ImageDetail() {
  const localize = useLocalize();
  const { selectedCreation, setSelectedCreation } = useStudioContext();
  const [zoom, setZoom] = useState(1);
  const [showUsageMenu, setShowUsageMenu] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!selectedCreation) return null;

  const activeUrl = selectedCreation.urls[activeImageIndex] ?? '';
  const formattedDate = new Date(selectedCreation.createdAt).toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleClose = () => {
    setSelectedCreation(null);
    setZoom(1);
    setActiveImageIndex(0);
  };

  return (
    <div
      className="flex h-full flex-col overflow-y-auto"
      aria-label={localize('com_studio_image_detail')}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          aria-label={localize('com_studio_back_to_studio')}
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          {localize('com_studio_back_to_studio')}
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            aria-label="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border-light hover:bg-surface-hover"
          >
            <ZoomOut className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-label="Reset zoom"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border-light hover:bg-surface-hover"
          >
            <RotateCcw className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            aria-label="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border-light hover:bg-surface-hover"
          >
            <ZoomIn className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="relative mx-4 mb-3 overflow-hidden rounded-xl border border-border-light bg-surface-secondary">
        <div className="flex min-h-[280px] items-center justify-center overflow-auto">
          {activeUrl ? (
            <img
              src={activeUrl}
              alt={selectedCreation.prompt}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }}
              className="max-h-[400px] max-w-full object-contain"
            />
          ) : (
            <div className="flex h-[280px] w-full items-center justify-center">
              <div className="h-8 w-8 rounded bg-border-light" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {selectedCreation.urls.length > 1 && (
        <div className="mb-3 flex justify-center gap-2 px-4">
          {selectedCreation.urls.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveImageIndex(i)}
              aria-pressed={i === activeImageIndex}
              className={cn(
                'h-12 w-12 overflow-hidden rounded-lg border-2 transition-all',
                i === activeImageIndex ? 'border-text-primary' : 'border-border-light',
              )}
            >
              <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUsageMenu(!showUsageMenu)}
            aria-expanded={showUsageMenu}
            aria-haspopup="menu"
            className="flex w-full items-center justify-between rounded-xl bg-surface-submit px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-surface-submit-hover"
          >
            {localize('com_studio_use_image')}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showUsageMenu && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
          {showUsageMenu && (
            <div
              role="menu"
              className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-border-light bg-surface-primary py-1 shadow-lg"
            >
              {USE_IMAGE_ACTIONS.map(({ key, labelKey, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  onClick={() => setShowUsageMenu(false)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {localize(labelKey)}
                </button>
              ))}
            </div>
          )}
        </div>

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Prompt
          </h3>
          <p className="rounded-lg bg-surface-secondary p-3 text-sm leading-relaxed text-text-primary">
            {selectedCreation.prompt}
          </p>
        </section>

        {selectedCreation.references.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-secondary">
              References used
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedCreation.references.map((ref) => (
                <div key={ref.id} className="flex items-center gap-1.5 rounded-lg border border-border-light bg-surface-secondary px-2 py-1">
                  {ref.url && (
                    <img src={ref.url} alt={ref.name} className="h-5 w-5 rounded object-cover" />
                  )}
                  <span className="text-xs font-mono text-text-secondary">{ref.slot}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Details
          </h3>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border-light bg-surface-secondary p-3">
            {[
              { label: 'Model', value: selectedCreation.model },
              { label: 'Aspect', value: selectedCreation.aspectRatio },
              { label: 'Resolution', value: selectedCreation.resolution },
              { label: 'Date', value: formattedDate },
              ...(selectedCreation.collection
                ? [{ label: 'Collection', value: selectedCreation.collection }]
                : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</p>
                <p className="text-xs font-medium text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <Lineage nodes={[]} />

        <InlineEditor />
      </div>
    </div>
  );
}
