import express from 'express';
import SummaryController from '../controllers/summaryController.js';

const router = express.Router();

router.post('/summary', SummaryController.getBuildSummary);

export default router;