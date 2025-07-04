import express from 'express';
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getAllCategoriesWithBadges
} from '../controllers/category.controller.js';
import { protectUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// CRUD
router.post('/', protectUser, createCategory);           // Create
router.get('/', getAllCategories);                   // Read all
router.get('/with-badges', getAllCategoriesWithBadges);      // Get all with badges
router.get('/:id', getCategoryById);                 // Read one
router.put('/:id', protectUser, updateCategory);         // Update
router.delete('/:id', protectUser, deleteCategory);      // Delete

export default router;
