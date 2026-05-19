import automationSchema, { notificationSchema } from '~/schema/automation';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IAutomation, INotification } from '~/types/automation';

export function createAutomationModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(automationSchema);
  return (
    mongoose.models.Automation ||
    mongoose.model<IAutomation>('Automation', automationSchema)
  );
}

export function createNotificationModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(notificationSchema);
  return (
    mongoose.models.Notification ||
    mongoose.model<INotification>('Notification', notificationSchema)
  );
}
