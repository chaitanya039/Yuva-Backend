import express from 'express';
import {
  createOrderRequest,
  getAllOrderRequests,
  approveOrderRequest,
  rejectOrderRequest,
  getOrderRequestsByCustomer
} from '../controllers/orderRequest.controller.js';

import { protectUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Customer submits request
router.post('/', protectUser, createOrderRequest);

// Admin manages requests
router.get('/', protectUser, getAllOrderRequests);
router.get("/my", protectUser, getOrderRequestsByCustomer);
router.put('/approve/:id', protectUser, approveOrderRequest);
router.put('/reject/:id', protectUser, rejectOrderRequest);

export default router;
