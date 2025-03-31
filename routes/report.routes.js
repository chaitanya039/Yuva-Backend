import express from 'express';
import { exportOrdersToExcel, exportExpensesToExcel, getTopSellingProducts } from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/orders/export', protect, exportOrdersToExcel);
router.get('/expenses/export', protect, exportExpensesToExcel);
router.get("/top-selling-products", getTopSellingProducts);

export default router;
