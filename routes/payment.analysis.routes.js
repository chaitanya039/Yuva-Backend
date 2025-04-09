import express from "express";
import {
  getTotalRevenueCollected,
  getOutstandingBalance,
  getAverageRecoveryPercentage,
  getPaymentStatusDistribution,
  getDiscountStats,
  getPartialPaymentsAndHighDueCustomers,
  getTopCustomersPaymentBehavior,
  getMonthlyCollectionTrend,
} from "../controllers/payment.analysis.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 📊 Core KPIs
router.get("/total-revenue", protect, getTotalRevenueCollected);
router.get("/outstanding-balance", protect, getOutstandingBalance);
router.get("/average-recovery", protect, getAverageRecoveryPercentage);
router.get("/payment-status-distribution", protect, getPaymentStatusDistribution);
router.get("/discount-stats", protect, getDiscountStats);

// 📍 Advanced Insights
router.get("/monthly-collection-trend", protect, getMonthlyCollectionTrend);
router.get("/partial-payments", protect, getPartialPaymentsAndHighDueCustomers);
router.get("/top-customers", protect, getTopCustomersPaymentBehavior);

export default router;
