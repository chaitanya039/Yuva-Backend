// routes/user.routes.js

import express from 'express';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/multer.middleware.js';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  toggleUserStatus,
} from '../controllers/user.controller.js';

const router = express.Router();

// All routes protected, only accessible by Admins or higher
router.use(protect);

// GET all users (superAdmin, admin)
router.get('/', authorizeRoles('Admin'), getAllUsers);

// GET single user
router.get('/:id', authorizeRoles('Admin'), getUserById);

// CREATE user (only superAdmin)
router.post(
  '/',
  authorizeRoles('Admin'),
  upload.single('profileImg'),
  createUser
);

// UPDATE user
router.put(
  '/:id',
  authorizeRoles('Admin'),
  upload.single('profileImg'),
  updateUser
);

// DELETE user
router.delete('/:id', authorizeRoles('Admin'), deleteUser);

// TOGGLE status
router.patch('/:id/status', authorizeRoles('Admin'), toggleUserStatus);

export default router;
