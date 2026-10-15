import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../queues/emailQueue';

export const QUEUE_BOARD_PATH = '/admin/queues';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(QUEUE_BOARD_PATH);

createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter });

export const queueBoardRouter = serverAdapter.getRouter();
