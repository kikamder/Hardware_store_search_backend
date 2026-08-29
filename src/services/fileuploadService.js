import cloudinary from '../configs/cloudinaryConfig.js';

class UploadService {
  /**
   * @param {Buffer} fileBuffer - ไฟล์ในรูป buffer (จาก multer memoryStorage)
   * @param {string|number} ownerId - ใช้ตั้งชื่อไฟล์ให้ไม่ชนกัน (เดิมโค้ดอ้าง uploaderId
   *   ที่ไม่เคยประกาศไว้ ทำให้ ReferenceError ทุกครั้งที่เรียก แก้โดยรับเป็น param แทน)
   * @param {string} label - ป้ายกำกับประเภทไฟล์ เช่น 'idCard', 'storeImage' (optional)
   */
  async uploadImage(fileBuffer, ownerId, label = 'file') {
    return new Promise((resolve, reject) => {
      const customFileName = `${label}_${ownerId ?? 'anonymous'}_${Date.now()}`;

      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'HardwareProject/Shop_identify_image',
          public_id: customFileName,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );
      stream.end(fileBuffer);
    });
  }
}

export default new UploadService();