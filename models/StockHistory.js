import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  action: {
    type: String,
    enum: ['add', 'reduce'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: Number,
  newStock: Number,
  remarks: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true
});

const StockHistory = mongoose.model('StockHistory', stockHistorySchema);
export default StockHistory;
