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

import { protectUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 🔹 Create Order (Admin or Authenticated Customer)
router.post("/", protectUser, createOrder);

// 🔹 Update Order (Edit status or full update)
router.put("/:id", protectUser, updateOrder);

// 🔹 Update Payment of order
router.patch("/:id/payment", updateOrderPayment);

// 🔹 Delete Order
router.delete("/:id", protectUser, deleteOrder);

// 🔹 Get All Orders (with filters, pagination)
router.get("/", protectUser, getAllOrders);

// 🔹 Get Recent Orders
router.get("/recent", protectUser, getRecentOrders);

// 🔹 Get Orders by Customer Type (Retailer/Wholesaler)
router.get("/type/:type", protectUser, getOrdersByCustomerType);

// 🔹 Get Specific Order Details
router.get("/:id", protectUser, getOrderDetails);

// 🔹 Export All Orders to CSV
router.get("/export/csv", protectUser, exportOrders);

export default router;
