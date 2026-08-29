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

// app.get('/mock-upload', (req, res) => {
//   res.send(`
//     <!DOCTYPE html>
//     <html lang="th">
//       <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>ทดสอบ Upload & Random Request (Signed Mode)</title>
//         <style>
//           body { font-family: sans-serif; padding: 50px; max-width: 600px; margin: auto; }
//           .container { border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
//           button { padding: 10px 15px; cursor: pointer; margin-top: 10px; border-radius: 4px; border: none; }
//           .btn-upload { background-color: #4CAF50; color: white; }
//           .btn-random { background-color: #333; color: white; }
//           #preview { max-width: 100%; height: auto; display: none; margin-top: 15px; border-radius: 5px; }
//           .result-box { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px; display: none; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <h2>ทดสอบระบบอัปโหลด (ผ่าน Backend)</h2>
          
//           <input type="file" id="fileInput" accept="image/*" />
//           <br />
//           <button class="btn-upload" onclick="uploadFile()">📤 ส่งรูปไปที่เซิร์ฟเวอร์</button>
          
//           <p id="status" style="font-weight: bold; margin-top: 15px;"></p>
          
//           <div id="resultBox" class="result-box">
//             <h3 style="margin-top: 0;">อัปโหลดสำเร็จ!</h3>
//             <p id="urlText" style="word-break: break-all; font-size: 14px; color: #0066cc;"></p>
//             <img id="preview" alt="Preview Image" />
//             <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />
//             <button class="btn-random" onclick="sendRandomRequest()">🎲 ปุ่มสุ่ม Request</button>
//           </div>
//         </div>

//         <script>
//           // 1. ฟังก์ชันจัดการการอัปโหลดไฟล์
//           async function uploadFile() {
//             const fileInput = document.getElementById('fileInput');
//             const status = document.getElementById('status');
//             const preview = document.getElementById('preview');
//             const urlText = document.getElementById('urlText');
//             const resultBox = document.getElementById('resultBox');

//             if (!fileInput.files[0]) {
//               return alert('กรุณาเลือกไฟล์ก่อนครับ!');
//             }

//             status.innerText = '⏳ กำลังประมวลผลผ่าน Backend ของเรา...';
//             status.style.color = '#ff9800';
//             resultBox.style.display = 'none';
            
//             const formData = new FormData();
//             // ต้องตั้งชื่อว่า 'image' ให้ตรงกับออปชัน upload.single('image') ใน Backend
//             formData.append('image', fileInput.files[0]);

//             try {
//               // ยิงมาที่ API หลังบ้านของเราเอง
//               const res = await fetch('/api/upload', {
//                 method: 'POST',
//                 body: formData
//               });
              
//               const data = await res.json();
              
//               if (res.ok) {
//                 status.innerText = '✅ อัปโหลดขึ้น Cloudinary สำเร็จ!';
//                 status.style.color = '#4CAF50';
                
//                 urlText.innerText = data.url;
//                 preview.src = data.url;
                
//                 preview.style.display = 'block';
//                 resultBox.style.display = 'block'; // โชว์กรอบผลลัพธ์และปุ่มสุ่ม
//               } else {
//                 status.innerText = '❌ ล้มเหลว: ' + (data.error || 'Unknown Error');
//                 status.style.color = '#f44336';
//                 console.error("Backend Error:", data);
//               }
//             } catch (err) {
//               console.error(err);
//               status.innerText = '❌ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
//               status.style.color = '#f44336';
//             }
//           }

//           // 2. ฟังก์ชันยิง Random Request
//           async function sendRandomRequest() {
//             try {
//               // สมมติว่ามี Route /api/upload/random รองรับไว้ (ถ้าชื่อ Route อื่น ให้แก้ตรงนี้นะครับ)
//               const res = await fetch('/api/upload/random', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ message: 'นี่คือ Request ที่สุ่มส่งขึ้นไป!' })
//               });
              
//               const data = await res.json();
//               if (res.ok) {
//                 alert('เซิร์ฟเวอร์ตอบกลับมาว่า: ' + JSON.stringify(data));
//               } else {
//                 alert('ยิงไปแล้ว แต่ Route อาจจะยังไม่พร้อม (ได้ status ไม่ใช่ 200)');
//               }
//             } catch (err) {
//               alert('ยิง Request ไม่สำเร็จครับ เช็คคอนโซลดูนะ');
//             }
//           }
//         </script>
//       </body>
//     </html>
//   `);
// });