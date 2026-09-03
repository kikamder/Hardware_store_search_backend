import 'dotenv/config';
import express from 'express';
import cors from 'cors';


import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/fileuploadRoutes.js';
import shopRoute from './routes/shopRoutes.js';
import userRoutes from './routes/userRoutes.js';
import hardwareRoutes from './routes/hardwareRoutes.js';
import buildRoutes from './routes/buildRoutes.js'; 
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://pc-finder-frontend-2.vercel.app']
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend Server is running successfully!' });
});

// เอา Route มาต่อเข้ากับระบบ
app.use('/api/auth', authRoutes);
app.use('/api/stores', shopRoute);
//app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/hardware',hardwareRoutes);
app.use('/api/builds', buildRoutes);

const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

