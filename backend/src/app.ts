import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { healthRouter } from './routes/health';

export const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use('/health', healthRouter);

// real api routes get added here in later phases

app.use(notFound);
app.use(errorHandler);