import express from 'express';
import { auth } from './middleware/auth';
import execRouter from './routes/exec';
import uploadRouter from './routes/upload';
import filesRouter from './routes/files';
import downloadRouter from './routes/download';

const app = express();
const PORT = parseInt(process.env.PORT ?? '8080', 10);

app.use(express.json({ limit: '150mb' }));
app.use(auth);

app.use('/v1', execRouter);
app.use('/v1', uploadRouter);
app.use('/v1', filesRouter);
app.use('/v1', downloadRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Code Interpreter Gateway running on port ${PORT}`);
  console.log(`Piston URL: ${process.env.PISTON_URL ?? 'http://localhost:2000'}`);
});
