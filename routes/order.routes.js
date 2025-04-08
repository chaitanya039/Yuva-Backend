import express from 'express';
import {
  createOrder,
  updateOrder,
  deleteOrder,
  getAllOrders,
  getOrderDetails,
  getOrdersByCustomerType,
  getRecentOrders,
  exportOrders,
  updateOrderPayment,
} from '../controllers/order.controller.js';

import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 🔹 Create Order (Admin or Authenticated Customer)
router.post("/", protect, createOrder);

// 🔹 Update Order (Edit status or full update)
router.put("/:id", protect, updateOrder);

// 🔹 Update Payment of order
router.patch("/:id/payment", updateOrderPayment);

// 🔹 Delete Order
router.delete("/:id", protect, deleteOrder);

// 🔹 Get All Orders (with filters, pagination)
router.get("/", protect, getAllOrders);

// 🔹 Get Recent Orders
router.get("/recent", protect, getRecentOrders);

// 🔹 Get Orders by Customer Type (Retailer/Wholesaler)
router.get("/type/:type", protect, getOrdersByCustomerType);

// 🔹 Get Specific Order Details
router.get("/:id", protect, getOrderDetails);

// 🔹 Export All Orders to CSV
router.get("/export/csv", protect, exportOrders);

export default router;
