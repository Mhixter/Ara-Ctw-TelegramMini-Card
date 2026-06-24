import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import authRouter from './routes/auth';
import walletRouter from './routes/wallet';
import kycRouter from './routes/kyc';
import cardsRouter from './routes/cards';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(express.static(path.join(__dirname, '../dist')));
app.get(/(.*)/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
