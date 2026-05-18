import type { StudioModelId } from './types';

export type ProvenanceManifest = {
  claimGenerator: string;
  assertions: {
    action: 'c2pa.created';
    softwareAgent: string;
    model: StudioModelId;
    useCase: string;
    digitalSourceType: 'trainedAlgorithmicMedia';
  }[];
  createdAt: string;
};

/**
 * Builds a C2PA-style provenance manifest recorded alongside every generation
 * for audit (PRD §5.7). Cryptographic embedding into the image binary is a
 * follow-up that requires the `c2pa-node` signing dependency — until then the
 * manifest is persisted with the creation record so provenance is auditable.
 */
export const buildProvenanceManifest = (params: {
  model: StudioModelId;
  useCase: string;
  createdAt: Date;
}): ProvenanceManifest => ({
  claimGenerator: 'LibreChat-Studio/1.0',
  assertions: [
    {
      action: 'c2pa.created',
      softwareAgent: `studio:${params.model}`,
      model: params.model,
      useCase: params.useCase,
      digitalSourceType: 'trainedAlgorithmicMedia',
    },
  ],
  createdAt: params.createdAt.toISOString(),
});
