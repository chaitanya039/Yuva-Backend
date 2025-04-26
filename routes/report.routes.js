import express from 'express';
import { protectUser } from '../middlewares/auth.middleware.js';
import {
  exportOrdersToExcel,
  exportExpensesToExcel,
  getTopSellingProducts,
  getMonthlyRevenueReport,
  getDiscountImpactReport,
  getRevenueBySegmentReport,
  getARAgingReport,
  getOutstandingInvoiceRegister,
  getDSOReport,
} from '../controllers/report.controller.js';

const router = express.Router();

// protectUser every report route
router.use(protectUser);

// Excel & PDF exports
router.get('/orders/export', exportOrdersToExcel);
router.get('/expenses/export', exportExpensesToExcel);

// Analytics endpoints (JSON / Excel / PDF)
router.get('/top-selling-products', getTopSellingProducts);
router.get('/monthly-revenue', getMonthlyRevenueReport);
router.get('/discount-impact', getDiscountImpactReport);
router.get('/revenue-by-segment', getRevenueBySegmentReport);
router.get('/ar-aging', getARAgingReport);
router.get('/outstanding-invoices', getOutstandingInvoiceRegister);
router.get('/dso', getDSOReport);

export default router;
