import express from 'express';
import {
  registerUser,
  loginUser,
  registerCustomer,
  loginCustomer,
  getCurrentUser,
  logout
} from '../controllers/auth.controller.js';
import upload from '../middlewares/multer.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User/Auth Routes
router.post('/user/register', upload.single('profileImg'), registerUser);
router.post('/user/login', loginUser);
router.post('/user/logout', protect, logout);
router.get('/user/me', protect, getCurrentUser);

// Customer Routes
router.post('/customer/register', upload.single('profileImg'), registerCustomer);
router.post('/customer/login', loginCustomer);
router.get('/customer/me', protect, getCurrentUser);

export default router;
