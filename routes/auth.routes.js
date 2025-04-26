import express from 'express';
import {
  registerUser,
  loginUser,
  registerCustomer,
  loginCustomer,
  getCurrentUser,
  logout,
  getCustomerProfile
} from '../controllers/auth.controller.js';
import upload from '../middlewares/multer.middleware.js';
import { protectCustomer, protectUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User/Auth Routes
router.post('/user/register', upload.single('profileImg'), registerUser);
router.post('/user/login', loginUser);
router.post('/user/logout', protectUser, logout);
router.get('/user/me', protectUser, getCurrentUser);

// Customer Routes
router.post('/customer/register', upload.single('profileImg'), registerCustomer);
router.post('/customer/login', loginCustomer);
router.post('/customer/logout', protectCustomer, logout);
router.get('/customer/me', protectCustomer, getCustomerProfile);

export default router;
