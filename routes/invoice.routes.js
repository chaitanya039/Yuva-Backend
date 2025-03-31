// routes/invoice.routes.js

import express from 'express';
import { generateInvoice } from '../controllers/invoice.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:orderId', protect, generateInvoice); // only admin/staff

export default router;
