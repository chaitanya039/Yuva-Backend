import express from 'express';
import {
  createExpense,
  getAllExpenses,
  getExpensesByCategory, // Optional: may be deprecated
  updateExpense,
  deleteExpense,
  getMonthlyExpenseTrend
} from '../controllers/expense.controller.js';

import { protectUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Create a new expense
router.post('/', protectUser, createExpense);

// Get all expenses with optional filters
router.get('/', getAllExpenses);

// (Optional legacy) Get expenses by category
router.get('/category/:category', getExpensesByCategory);

// Update an expense
router.put('/:id', protectUser, updateExpense);

// Delete an expense
router.delete('/:id', protectUser, deleteExpense);

router.get('/trend/monthly', protectUser, getMonthlyExpenseTrend);


export default router;
