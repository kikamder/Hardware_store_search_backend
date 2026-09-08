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



app.get('/debug/db-connectivity', (req, res) => {
  const host = 'aws-0-ap-northeast-1.pooler.supabase.com';
  const port = 5432;
  const socket = new net.Socket();
  const start = Date.now();

  socket.setTimeout(5000);

  socket.connect(port, host, () => {
    res.json({ status: 'connected', ms: Date.now() - start, host, port });
    socket.destroy();
  });

  socket.on('timeout', () => {
    res.json({ status: 'timeout', ms: Date.now() - start, host, port });
    socket.destroy();
  });

  socket.on('error', (err) => {
    res.json({ status: 'error', message: err.message, ms: Date.now() - start, host, port });
  });
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


app.get('/mock-login', (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mock Google Login</title>
      <!-- 1. โหลด Script ของ Google Identity Services -->
      <script src="https://accounts.google.com/gsi/client" async defer></script>
    </head>
    <body style="display: flex; justify-content: center; margin-top: 100px;">

      <!-- 2. ตั้งค่า Google Client ID และกำหนดฟังก์ชัน Callback -->
      <div id="g_id_onload"
           data-client_id="11023723698-j01jtpar4vpeleb5lc91g3astl39hsgj.apps.googleusercontent.com"
           data-callback="handleCredentialResponse">
      </div>
      
      <!-- 3. จุดที่จะให้ปุ่ม Login ปรากฏ -->
      <div class="g_id_signin" data-type="standard"></div>

      <!-- 4. ฟังก์ชันจัดการเมื่อล็อกอินสำเร็จ -->
      <script>
        function handleCredentialResponse(response) {
          // แสดง Token ออกทาง Console
          console.log("Google Token:", response.credential);
          
        }
      </script>

    </body>
    </html>
  `;

  // ส่ง HTML กลับไปแสดงที่เบราว์เซอร์
  res.send(html);
});