import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type {
  AspectRatio,
  Resolution,
  StudioCreation,
  StudioReference,
  StudioUseCase,
} from 'librechat-data-provider';
import { USE_CASE_SCHEMAS } from './schemas';

type StudioMode = 'workspace' | 'detail' | 'editing';

type StudioState = {
  activeUseCase: StudioUseCase;
  advancedMode: boolean;
  mode: StudioMode;
  references: StudioReference[];
  formValues: Record<string, string | boolean>;
  prompt: string;
  imageCount: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  selectedCreation: StudioCreation | null;
  creations: StudioCreation[];
};

type StudioAction =
  | { type: 'SET_USE_CASE'; payload: StudioUseCase }
  | { type: 'SET_ADVANCED_MODE'; payload: boolean }
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_FORM_VALUE'; payload: { id: string; value: string | boolean } }
  | { type: 'SET_IMAGE_COUNT'; payload: number }
  | { type: 'SET_ASPECT_RATIO'; payload: AspectRatio }
  | { type: 'SET_RESOLUTION'; payload: Resolution }
  | { type: 'ADD_REFERENCE'; payload: StudioReference }
  | { type: 'REMOVE_REFERENCE'; payload: string }
  | { type: 'SELECT_CREATION'; payload: StudioCreation | null }
  | { type: 'SET_MODE'; payload: StudioMode }
  | { type: 'ADD_CREATION'; payload: StudioCreation };

function buildDefaultFormValues(useCaseId: StudioUseCase): Record<string, string | boolean> {
  const schema = USE_CASE_SCHEMAS.find((s) => s.id === useCaseId);
  if (!schema) return {};
  return Object.fromEntries(
    schema.formFields
      .filter((f) => f.default !== undefined)
      .map((f) => [f.id, f.default as string | boolean]),
  );
}

function buildDefaults(useCaseId: StudioUseCase): Partial<StudioState> {
  const schema = USE_CASE_SCHEMAS.find((s) => s.id === useCaseId);
  if (!schema) return {};
  return {
    aspectRatio: schema.uiDefaults.aspectRatio,
    imageCount: schema.uiDefaults.imageCount,
    resolution: schema.uiDefaults.resolution,
    formValues: buildDefaultFormValues(useCaseId),
  };
}

function assignRefLabels(refs: StudioReference[]): StudioReference[] {
  let imgIndex = 1;
  return refs.map((r) => {
    if (r.slotType === 'style' || r.slotType === 'character') return r;
    return { ...r, label: `@img${imgIndex++}` };
  });
}

const INITIAL_USE_CASE: StudioUseCase = 'color_variants';
const initialUCDefaults = buildDefaults(INITIAL_USE_CASE);

const initialState: StudioState = {
  activeUseCase: INITIAL_USE_CASE,
  advancedMode: false,
  mode: 'workspace',
  references: [],
  formValues: initialUCDefaults.formValues ?? {},
  prompt: '',
  imageCount: initialUCDefaults.imageCount ?? 4,
  aspectRatio: initialUCDefaults.aspectRatio ?? '4:5',
  resolution: initialUCDefaults.resolution ?? '2K',
  selectedCreation: null,
  creations: [],
};

function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'SET_USE_CASE': {
      const defaults = buildDefaults(action.payload);
      return {
        ...state,
        activeUseCase: action.payload,
        formValues: defaults.formValues ?? {},
        aspectRatio: defaults.aspectRatio ?? state.aspectRatio,
        imageCount: defaults.imageCount ?? state.imageCount,
        resolution: defaults.resolution ?? state.resolution,
        mode: 'workspace',
        selectedCreation: null,
      };
    }
    case 'SET_ADVANCED_MODE':
      return { ...state, advancedMode: action.payload };
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    case 'SET_FORM_VALUE':
      return {
        ...state,
        formValues: { ...state.formValues, [action.payload.id]: action.payload.value },
      };
    case 'SET_IMAGE_COUNT':
      return { ...state, imageCount: Math.max(1, Math.min(8, action.payload)) };
    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.payload };
    case 'SET_RESOLUTION':
      return { ...state, resolution: action.payload };
    case 'ADD_REFERENCE': {
      if (state.references.length >= 8) return state;
      const updated = assignRefLabels([...state.references, action.payload]);
      return { ...state, references: updated };
    }
    case 'REMOVE_REFERENCE': {
      const filtered = state.references.filter((r) => r.id !== action.payload);
      return { ...state, references: assignRefLabels(filtered) };
    }
    case 'SELECT_CREATION':
      return {
        ...state,
        selectedCreation: action.payload,
        mode: action.payload ? 'detail' : 'workspace',
      };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'ADD_CREATION':
      return { ...state, creations: [action.payload, ...state.creations] };
    default:
      return state;
  }
}

type StudioContextValue = StudioState & {
  dispatch: Dispatch<StudioAction>;
  activeSchema: ReturnType<typeof USE_CASE_SCHEMAS.find>;
  imageRefLabels: string[];
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const activeSchema = useMemo(
    () => USE_CASE_SCHEMAS.find((s) => s.id === state.activeUseCase),
    [state.activeUseCase],
  );

  const imageRefLabels = useMemo(
    () =>
      state.references
        .filter((r) => r.slotType === 'image')
        .map((r) => r.label)
        .filter(Boolean),
    [state.references],
  );

  const value = useMemo(
    () => ({ ...state, dispatch, activeSchema, imageRefLabels }),
    [state, activeSchema, imageRefLabels],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
}

export function useStudioDispatch() {
  const { dispatch } = useStudio();
  return dispatch;
}

export function useGenerateImages() {
  const { activeUseCase, prompt, imageCount, aspectRatio, resolution, activeSchema, references } =
    useStudio();
  const dispatch = useStudioDispatch();

  return useCallback(() => {
    // TODO(tech): wire to actual generation API
    const creation: StudioCreation = {
      id: crypto.randomUUID(),
      prompt: prompt || '(sem prompt)',
      useCase: activeUseCase,
      model: activeSchema?.defaultModel ?? 'nano-banana-pro',
      aspectRatio,
      resolution,
      imageCount,
      createdAt: new Date(),
      images: [],
      referenceCount: references.length,
      collectionName: null,
      status: 'generating',
    };
    dispatch({ type: 'ADD_CREATION', payload: creation });
  }, [activeUseCase, prompt, imageCount, aspectRatio, resolution, activeSchema, references, dispatch]);
}
