// models/Order.js

import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0, // 💸 Amount to subtract from totalAmount
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Completed", "Cancelled"],
      default: "Processing",
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["Pending", "Processing", "Completed", "Cancelled"],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    specialInstructions: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);


// ✅ Pre-save hook to generate orderId
orderSchema.pre("validate", async function (next) {
  if (!this.orderId) {
    const uniqueSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toLowerCase(); // e.g. 43d6
    this.orderId = `#ORD-${uniqueSuffix}`;
  }
  next();
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
