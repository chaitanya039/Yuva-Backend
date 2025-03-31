import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Worker', 'RawMaterial', 'Daily', 'Transport'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  note: {
    type: String
  },
  expenseDate: {
    type: Date,
    default: Date.now
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
