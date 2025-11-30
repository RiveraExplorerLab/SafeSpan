import express from 'express';
import cors from 'cors';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import overviewRouter from './routes/overview.js';
import settingsRouter from './routes/settings.js';
import accountsRouter from './routes/accounts.js';
import billsRouter from './routes/bills.js';
import transactionsRouter from './routes/transactions.js';
import payPeriodsRouter from './routes/payPeriods.js';
import recurringRouter from './routes/recurring.js';
import goalsRouter from './routes/goals.js';
import adminRouter from './routes/admin.js';

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Auth middleware for all /api routes
app.use('/api', authenticate);

// Routes
app.use('/api/overview', overviewRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/pay-periods', payPeriodsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/admin', adminRouter);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
