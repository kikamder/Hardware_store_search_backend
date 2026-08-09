import express from 'express';
import cors from 'cors';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';

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

const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/mock-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <body style="font-family: sans-serif; padding: 50px;">
        <h2>ทดสอบ Google Login (สำหรับ Backend)</h2>
        
        <!-- โหลดสคริปต์สร้างปุ่มจาก Google -->
        <script src="https://accounts.google.com/gsi/client" async></script>
        
        <!-- ⚠️ อย่าลืมเอา Client ID ของคุณมาใส่ในบรรทัด data-client_id ⚠️ -->
        <div id="g_id_onload"
             data-client_id="11023723698-j01jtpar4vpeleb5lc91g3astl39hsgj.apps.googleusercontent.com"
             data-callback="handleCredentialResponse">
        </div>
        
        <!-- จุดที่จะแสดงปุ่ม -->
        <div class="g_id_signin" data-type="standard"></div>
        
        <!-- โค้ดสำหรับรับ Token เมื่อล็อกอินเสร็จ -->
        <script>
          function handleCredentialResponse(response) {
             console.log("🔥 นำ Token ด้านล่างนี้ไปใส่ใน Postman ได้เลย:");
             console.log(response.credential);
             document.body.innerHTML += "<h3 style='color: green;'>✅ ล็อกอินสำเร็จ! กด F12 เพื่อเปิดดู Token ใน Console ได้เลย</h3>";
          }
        </script>
      </body>
    </html>
  `);
});