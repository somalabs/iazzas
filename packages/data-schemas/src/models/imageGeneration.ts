import imageGenerationSchema from '~/schema/imageGeneration';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IImageGeneration } from '~/types';

export function createImageGenerationModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(imageGenerationSchema);
  return (
    mongoose.models.ImageGeneration ||
    mongoose.model<IImageGeneration>('ImageGeneration', imageGenerationSchema)
  );
}
