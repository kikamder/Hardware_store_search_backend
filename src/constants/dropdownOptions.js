export const CATEGORY_OPTIONS = [
  { value: 'CPU', label: 'ซีพียู (CPU)' },
  { value: 'MAINBOARD', label: 'เมนบอร์ด (Mainboard)' },
  { value: 'VGA', label: 'การ์ดจอ (VGA)' },
  { value: 'RAM', label: 'แรม (RAM)' },
  { value: 'STORAGE', label: 'อุปกรณ์จัดเก็บข้อมูล (Storage)' },
  { value: 'PSU', label: 'เพาเวอร์ซัพพลาย (PSU)' },
  { value: 'CASE', label: 'เคสคอมพิวเตอร์ (Case)' },
  { value: 'COOLER', label: 'ชุดระบายความร้อน (Cooler)' },
];

export const SHOP_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'รอการอนุมัติ' },
  { value: 'OPEN', label: 'เปิดร้าน' },
  { value: 'CLOSED', label: 'ปิดร้าน' },
  { value: 'REJECTED', label: 'ถูกปฏิเสธ' },
  { value: 'SUSPENDED', label: 'ถูกระงับ' },
];

export const USER_ROLE_OPTIONS = [
  { value: 'CUSTOMER', label: 'ลูกค้า' },
  { value: 'SHOP', label: 'ร้านค้า' },
  { value: 'ADMIN', label: 'ผู้ดูแลระบบ' },
];

export const USER_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ใช้งานได้' },
  { value: 'SUSPENDED', label: 'ถูกระงับ' },
];

export const PRODUCT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'เปิดขาย' },
  { value: 'NOT_ACTIVE', label: 'ปิดการขาย' },
];