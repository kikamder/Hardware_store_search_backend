import express from 'express';
import cors from 'cors';
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://ชื่อเว็บ-frontend-ของเพื่อน.vercel.app']
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend Server is running successfully!' });
});

// เอา Route มาต่อเข้ากับระบบ
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


