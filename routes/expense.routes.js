import express from 'express';
import {
  createExpense,
  getAllExpenses,
  getExpensesByCategory, // Optional: may be deprecated
  updateExpense,
  deleteExpense,
  getMonthlyExpenseTrend
} from '../controllers/expense.controller.js';

import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Create a new expense
router.post('/', protect, createExpense);

// Get all expenses with optional filters
router.get('/', getAllExpenses);

// (Optional legacy) Get expenses by category
router.get('/category/:category', getExpensesByCategory);

// Update an expense
router.put('/:id', protect, updateExpense);

// Delete an expense
router.delete('/:id', protect, deleteExpense);

router.get('/trend/monthly', protect, getMonthlyExpenseTrend);


export default router;
