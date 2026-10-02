import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requireUser } from './middleware/auth';
import { authRouter } from './routes/auth';
import { emailsRouter } from './routes/emails';
import { healthRouter } from './routes/health';
import { scheduleRouter } from './routes/schedule';

export const app = express();

app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/schedule', requireUser, scheduleRouter);
app.use('/api/emails', requireUser, emailsRouter);

app.use(notFound);
app.use(errorHandler);