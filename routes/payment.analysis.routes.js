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
import { protectUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 📊 Core KPIs
router.get("/total-revenue", protectUser, getTotalRevenueCollected);
router.get("/outstanding-balance", protectUser, getOutstandingBalance);
router.get("/average-recovery", protectUser, getAverageRecoveryPercentage);
router.get("/payment-status-distribution", protectUser, getPaymentStatusDistribution);
router.get("/discount-stats", protectUser, getDiscountStats);

// 📍 Advanced Insights
router.get("/monthly-collection-trend", protectUser, getMonthlyCollectionTrend);
router.get("/partial-payments", protectUser, getPartialPaymentsAndHighDueCustomers);
router.get("/top-customers", protectUser, getTopCustomersPaymentBehavior);

export default router;
