import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import multer from 'multer';

import {
  updateStock,
  getStockHistory,
  getInventoryOverview,
  getLowStockProducts,
  getRecentStockUpdates,
  getStockActivityChartData,
  getMostUpdatedProducts,
  getOrderSnapshot,
} from '../controllers/inventory.controller.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 🔁 Stock Management
router.patch('/update-stock/:productId', protect, updateStock);
router.get('/stock-history/:productId', protect, getStockHistory);

// 📊 Dashboard Analytics
router.get('/overview', getInventoryOverview);
router.get('/alerts', getLowStockProducts);
router.get('/recent-stock-updates', getRecentStockUpdates);
router.get('/stock-activity-chart', getStockActivityChartData);
router.get('/most-updated-products', getMostUpdatedProducts);
router.get('/order-snapshot', getOrderSnapshot);


export default router;
