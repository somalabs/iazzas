import studioCreationSchema from '~/schema/studio';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IStudioCreation } from '~/types/studio';

export function createStudioCreationModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(studioCreationSchema);
  return (
    mongoose.models.StudioCreation ||
    mongoose.model<IStudioCreation>('StudioCreation', studioCreationSchema)
  );
}
