import express from "express";
import {
  getKPIStats,
  getRevenueBreakdown,
  getExpenseBreakdown,
  getSalesByCategory,
  getMonthlyRevenueVsExpense,
  getNetProfitTrend,
  getTopCustomers,
  getMonthlyOrderCount,
  getOrderTypeDistribution,
  getTopCustomersByRevenue,
  getMostSoldProducts,
  getMonthlyOrderAndRevenueTrend,
  getCustomerTypeDistribution,
  getAverageOrderValueTrend,
  getCategoryWiseRevenue,
  getCustomerRegistrationTrend,
  getRecentActivity,
  getRepeatVsNewCustomers,
  getWeekdayOrderHeatmap,
  getCancelledOrdersStats,
  getLowStockProducts,
  getCustomerSegments,
  getRevenueByCity,
  getCustomerDistribution
} from "../controllers/analytics.controller.js";

const router = express.Router();

// 🔹 Overall KPI stats: revenue, orders, profit, etc.
router.get("/kpi", getKPIStats);

// 🔹 Double bar chart: Retailer vs Wholesaler (monthly/daily/yearly)
router.get("/revenue-breakdown", getRevenueBreakdown);

// 🔹 Pie chart data: category-wise expense breakdown
router.get("/expenses/breakdown", getExpenseBreakdown);

// 🔹 Pie chart data: category-wise sales breakdown
router.get("/sales-by-category", getSalesByCategory);

// 🔹 Area chart: monthly revenue vs expenses
router.get("/revenue-vs-expense", getMonthlyRevenueVsExpense);

// 🔹 Area chart: monthly profit trend
router.get("/net-profit-trend", getNetProfitTrend);

// 🔹 Leaderboard: top 10 customers by spending
router.get("/top-customers", getTopCustomers);

// 🔹 Bar chart: monthly order counts
router.get("/monthly-orders", getMonthlyOrderCount);

// 🔹 Donut chart: order distribution by customer type
router.get("/order-type-distribution", getOrderTypeDistribution);

// 🔹 Leaderboard: top 10 revenue-generating customers
router.get("/top-customers-by-revenue", getTopCustomersByRevenue);

// 🔹 Leaderboard: most sold products
router.get("/most-sold-products", getMostSoldProducts);

// 🔹 Line chart: monthly revenue and order trend
router.get("/monthly-order-revenue-trend", getMonthlyOrderAndRevenueTrend);

// 🔹 Donut chart: customer base segmentation
router.get("/customer-type-distribution", getCustomerTypeDistribution);

// 🔹 Line chart: average order value trend
router.get("/aov-trend", getAverageOrderValueTrend);

// 🔹 Pie chart: revenue by product category
router.get("/category-wise-revenue", getCategoryWiseRevenue);

// 🔹 Line chart: customer registration trend
router.get("/registration-trend", getCustomerRegistrationTrend);

// 🔹 Panel: recent activity in system
router.get("/recent-activity", getRecentActivity);

// 🔹 Donut chart: repeat vs new customers
router.get("/repeat-vs-new", getRepeatVsNewCustomers);

// 🔹 Heatmap: weekday-wise order distribution
router.get("/weekday-heatmap", getWeekdayOrderHeatmap);

// 🔹 Metric: cancelled or rejected orders
router.get("/cancelled-orders", getCancelledOrdersStats);

// 🔹 Metric: products with stock < 10
router.get("/low-stock-products", getLowStockProducts);

// 🔹 Donut chart: customer segmentation based on spend
router.get("/customer-segments", getCustomerSegments);

router.get("/customer-distribution", getCustomerDistribution);

// 🔹 Bar chart: city-wise revenue distribution
router.get("/revenue-by-city", getRevenueByCity);

export default router;