import { createContext, useContext, useState, useCallback } from 'react';
import type {
  AspectRatioValue,
  Creation,
  CreationFilters,
  ImageCount,
  Resolution,
  ReferenceSlot,
  StudioMode,
  UseCaseId,
} from './types';

type StudioContextValue = {
  mode: StudioMode;
  setMode: (mode: StudioMode) => void;
  selectedUseCase: UseCaseId | null;
  setSelectedUseCase: (uc: UseCaseId | null) => void;
  prompt: string;
  setPrompt: (p: string) => void;
  references: ReferenceSlot[];
  addReference: (ref: ReferenceSlot) => void;
  removeReference: (id: string) => void;
  imageCount: ImageCount;
  setImageCount: (n: ImageCount) => void;
  aspectRatio: AspectRatioValue;
  setAspectRatio: (r: AspectRatioValue) => void;
  resolution: Resolution;
  setResolution: (r: Resolution) => void;
  modelOverride: string;
  setModelOverride: (m: string) => void;
  selectedCreation: Creation | null;
  setSelectedCreation: (c: Creation | null) => void;
  filters: CreationFilters;
  setFilters: (f: CreationFilters) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
};

const StudioContext = createContext<StudioContextValue>({} as StudioContextValue);

export const useStudioContext = () => useContext(StudioContext);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<StudioMode>('guided');
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseId | null>(null);
  const [prompt, setPrompt] = useState('');
  const [references, setReferences] = useState<ReferenceSlot[]>([]);
  const [imageCount, setImageCount] = useState<ImageCount>(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioValue>('1:1');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [modelOverride, setModelOverride] = useState('');
  const [selectedCreation, setSelectedCreation] = useState<Creation | null>(null);
  const [filters, setFilters] = useState<CreationFilters>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const addReference = useCallback((ref: ReferenceSlot) => {
    setReferences((prev) => {
      if (prev.length >= 8) return prev;
      return [...prev, ref];
    });
  }, []);

  const removeReference = useCallback((id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <StudioContext.Provider
      value={{
        mode,
        setMode,
        selectedUseCase,
        setSelectedUseCase,
        prompt,
        setPrompt,
        references,
        addReference,
        removeReference,
        imageCount,
        setImageCount,
        aspectRatio,
        setAspectRatio,
        resolution,
        setResolution,
        modelOverride,
        setModelOverride,
        selectedCreation,
        setSelectedCreation,
        filters,
        setFilters,
        isGenerating,
        setIsGenerating,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}
