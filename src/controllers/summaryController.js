import SummaryService from '../services/summaryService.js';

class SummaryController {
  constructor({
    summaryService = SummaryService,
  } = {}) {

    this.summaryService = summaryService;
    this.getBuildSummary = this.getBuildSummary.bind(this);

  }

  async getBuildSummary(req, res) {
    try {
      const { shopProductId } = req.body;
      

      const idsArray = Array.isArray(shopProductId) ? shopProductId : [shopProductId];
      const safeIds = idsArray.map((id) => Number(id));

      const resultData = await this.summaryService.generateSummary(safeIds);

      return res.status(200).json({
        status: "success",
        message: "สร้างใบสรุปรายการสินค้าสำเร็จ",
        data: resultData,
      });

    } catch (error) {
      console.error("Generate Build Summary Error:", error);
      return res.status(500).json({
        status: "error",
        message: "เกิดข้อผิดพลาดในการสร้างใบสรุปรายการสินค้า",
      });
    }
  }
}

export { SummaryController };
export default new SummaryController();