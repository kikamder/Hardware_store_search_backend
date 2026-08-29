import uploadService from '../services/fileuploadService.js';

class UploadController {
  constructor() {
    this.upload = this.upload.bind(this);
  }

  async upload(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });

      // req.user?.userId เผื่อ route นี้ไม่ได้บังคับผ่าน verifyToken เสมอไป
      const imageUrl = await uploadService.uploadImage(req.file.buffer, req.user?.userId);

      res.status(200).json({ url: imageUrl });
    } catch (error) {
      console.error('Cloudinary Error:', error);
      res.status(500).json({ error: 'Upload failed', details: error.message });
    }
  }
}

export default new UploadController();