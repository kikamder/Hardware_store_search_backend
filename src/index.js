import 'dotenv/config';
import express from 'express';
import cors from 'cors';


import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/fileuploadRoutes.js';
import shopRoute from './routes/shopRoutes.js';
import userRoutes from './routes/userRoutes.js';
import hardwareRoutes from './routes/hardwareRoutes.js';
import buildRoutes from './routes/buildRoutes.js'; 
import dropdownRoutes from './routes/dropdownRoutes.js';
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://pc-finder-frontend-2.vercel.app']
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend Server is running successfully!' });
});


app.use('/api/auth', authRoutes);
app.use('/api/stores', shopRoute);
//app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hardware',hardwareRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/dropdowns', dropdownRoutes);



const PORT = process.env.PORT;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

async function gracefulShutdown(signal) {
  console.log(`${signal} received: closing server and disconnecting Prisma`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Cleanup complete, exiting');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


