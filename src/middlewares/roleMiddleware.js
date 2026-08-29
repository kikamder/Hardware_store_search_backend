
function roleCheck(allowedRoles) {
  // รับได้ทั้ง string เดี่ยวๆ ('user') หรือ array ('admin', 'staff')
  // แปลงให้เป็น array เสมอ เพื่อเช็คแบบเดียวกันทั้งสองเคส
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
 
  // ฟังก์ชันชั้นในนี่แหละคือตัว middleware จริง ที่ Express จะเรียกพร้อม req, res, next
  return (req, res, next) => {
    // กันเคส authenticate middleware ยังไม่ได้ทำงานก่อน หรือลืมใส่ใน route
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated: no user found in request' });
    }
 
    const userRole = req.user.role;
 
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden: you do not have permission to access this resource',
      });
    }
 
    // role ตรงตามที่กำหนด -> ปล่อยผ่านไป handler ถัดไป
    next();
  };
}
 
export default roleCheck;