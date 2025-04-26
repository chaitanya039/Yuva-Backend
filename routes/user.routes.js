// routes/user.routes.js

import express from 'express';
import { protectUser } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/role.middleware.js';
import upload from '../middlewares/multer.middleware.js';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getAllRoles, // ✅ import new controller
} from '../controllers/user.controller.js';

const router = express.Router();

// All routes below are protectUser
router.use(protectUser);

// ✅ GET all roles — for dropdowns
router.get('/roles', authorizeRoles('Admin'), getAllRoles);

// GET all users
router.get('/', authorizeRoles('Admin'), getAllUsers);

// GET single user
router.get('/:id', authorizeRoles('Admin'), getUserById);

// CREATE user (Admin or SuperAdmin)
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

// TOGGLE user status (active/inactive)
router.patch('/:id/status', authorizeRoles('Admin'), toggleUserStatus);

export default router;
