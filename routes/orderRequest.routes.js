import express from 'express';
import {
  createOrderRequest,
  getAllOrderRequests,
  approveOrderRequest,
  rejectOrderRequest,
  getOrderRequestsByCustomer
} from '../controllers/orderRequest.controller.js';

import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Customer submits request
router.post('/', protect, createOrderRequest);

// Admin manages requests
router.get('/', protect, getAllOrderRequests);
router.get("/my", protect, getOrderRequestsByCustomer);
router.put('/approve/:id', protect, approveOrderRequest);
router.put('/reject/:id', protect, rejectOrderRequest);

export default router;
