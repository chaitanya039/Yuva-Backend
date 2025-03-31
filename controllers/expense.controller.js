import Expense from '../models/Expense.js';
import ApiResponse from '../utils/ApiResponse.js';

// CREATE EXPENSE
export const createExpense = async (req, res) => {
  try {
    const { title, category, amount, note, expenseDate } = req.body;

    const expense = await Expense.create({
      title,
      category,
      amount,
      note,
      expenseDate,
      addedBy: req.user?._id,
    });

    return res.status(201).json(new ApiResponse(201, expense, 'Expense recorded successfully'));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// UPDATE EXPENSE
export const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, amount, note, expenseDate } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) return res.status(404).json(new ApiResponse(404, {}, 'Expense not found'));

    expense.title = title ?? expense.title;
    expense.category = category ?? expense.category;
    expense.amount = amount ?? expense.amount;
    expense.note = note ?? expense.note;
    expense.expenseDate = expenseDate ?? expense.expenseDate;

    await expense.save();

    return res.status(200).json(new ApiResponse(200, expense, 'Expense updated successfully'));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// DELETE EXPENSE
export const deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json(new ApiResponse(404, {}, 'Expense not found'));

    return res.status(200).json(new ApiResponse(200, {}, 'Expense deleted'));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// GET ALL EXPENSES with FILTERS
export const getAllExpenses = async (req, res) => {
  try {
    const { category, search, startDate, endDate, addedBy } = req.query;
    const filter = {};

    if (category && category !== 'All') filter.category = category;
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (addedBy) filter.addedBy = addedBy;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(filter)
      .populate('addedBy', 'name email')
      .sort({ expenseDate: -1 });

    return res.status(200).json(new ApiResponse(200, expenses, 'Filtered expenses fetched'));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// GET BY CATEGORY
export const getExpensesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const expenses = await Expense.find({ category }).populate('addedBy', 'name');
    return res.status(200).json(new ApiResponse(200, expenses, `Expenses for ${category}`));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// Get monthly trend (e.g., last 6 months)
export const getMonthlyExpenseTrend = async (req, res) => {
  try {
    const result = await Expense.aggregate([
      {
        $group: {
          _id: { year: { $year: "$expenseDate" }, month: { $month: "$expenseDate" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const formatted = result.map((r) => ({
      month: `${r._id.month}-${r._id.year}`,
      total: r.total,
    }));

    return res.status(200).json(new ApiResponse(200, formatted, "Monthly trend"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};
