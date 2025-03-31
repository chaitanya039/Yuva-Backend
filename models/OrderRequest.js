// ✅ Updated OrderRequest Model
import mongoose from 'mongoose';

const orderRequestSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    customerNote: {
      type: String,
    },
    decisionNote: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const OrderRequest = mongoose.model('OrderRequest', orderRequestSchema);
export default OrderRequest;
