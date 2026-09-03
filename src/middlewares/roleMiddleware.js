
function roleCheck(allowedRoles) {
  // รับได้ทั้ง string เดี่ยวๆ ('USER') หรือ array ('ADMIN', 'SHOP')
  // แปลงให้เป็น array เสมอ เพื่อเช็คแบบเดียวกันทั้งสองเคส
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
 t
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