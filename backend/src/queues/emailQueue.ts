import { Queue } from 'bullmq';
import { bullConnection } from '../lib/redis';
import { EMAIL_QUEUE_NAME, type EmailJobData } from './names';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: bullConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 86400, count: 5000 },
    removeOnFail: { age: 7 * 86400 },
  },
});
