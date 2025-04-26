// routes/invoice.routes.js

import express from 'express';
import { generateInvoice } from '../controllers/invoice.controller.js';
import { protectUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/:orderId', protectUser, generateInvoice); // only admin/staff

export default router;
