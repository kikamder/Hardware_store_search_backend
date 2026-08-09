import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    // 1. ดึงค่าจาก Header ที่ชื่อว่า "Authorization"
    const authHeader = req.headers.authorization;

    // 2. เช็คว่ามีการแนบ Header มาไหม และต้องขึ้นต้นด้วยคำว่า "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access Denied: No Token Provided' });
    }

    // === 3. หั่นข้อความเพื่อเอาเฉพาะตัว Token (เอาตัวที่ 2 หลังจากการเคาะเว้นวรรค) ====
    const token = authHeader.split(' ')[1];

    // 4. ตรวจสอบความถูกต้องและวันหมดอายุของ Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. นำข้อมูลที่ถอดรหัสได้ (เช่น userId, role) แปะติดไปกับ req 
    // เพื่อให้ Controller (เช่น getMe) ดึงไปใช้งานต่อได้ทันที
    req.user = decoded;

    // 6. อนุญาตให้ผ่านด่านไปยัง Controller ตัวต่อไปได้
    next();
  } catch (error) {
    // ดักจับกรณี Token หมดอายุ (สำคัญมาก เพราะ Frontend ของเพื่อนรอ Error ตัวนี้เพื่อไปขอ Token ใหม่)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token Expired' });
    }
    
    // ดักจับกรณี Token มั่วหรือโดนดัดแปลง
    return res.status(401).json({ error: 'Invalid Token' });
  }
};