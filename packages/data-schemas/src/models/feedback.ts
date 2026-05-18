import feedbackSchema from '~/schema/feedback';
import type { IFeedback } from '~/types/feedback';

export function createFeedbackModel(mongoose: typeof import('mongoose')) {
  return mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', feedbackSchema);
}
