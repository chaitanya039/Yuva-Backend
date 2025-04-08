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
      default: 0,
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
    netPayable: {
      type: Number,
      required: true,
      default: 0,
    },

    // ✅ Clean Payment Schema
    payment: {
      amountPaid: {
        type: Number,
        default: 0,
      },
      balanceRemaining: {
        type: Number,
        default: function () {
          return this.totalAmount - this.discount;
        },
      },
      status: {
        type: String,
        enum: ["Unpaid", "Partially Paid", "Paid"],
        default: "Unpaid",
      },
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Order ID Generator
orderSchema.pre("validate", async function (next) {
  if (!this.orderId) {
    const uniqueSuffix = Math.random()
      .toString(36)
      .substring(2, 6)
      .toLowerCase();
    this.orderId = `#ORD-${uniqueSuffix}`;
  }
  next();
});

// ✅ Auto-update Payment + Order Status
orderSchema.pre("save", function (next) {
  // ✅ Automatically calculate netPayable
  this.netPayable = this.totalAmount - this.discount;

  const paid = this.payment.amountPaid || 0;
  const remaining = this.netPayable - paid;

  this.payment.balanceRemaining = remaining;

  if (paid === 0) {
    this.payment.status = "Unpaid";
    this.status = "Pending";
  } else if (remaining > 0) {
    this.payment.status = "Partially Paid";
    this.status = "Processing";
  } else {
    this.payment.status = "Paid";
    this.status = "Completed";
  }

  next();
});


const Order = mongoose.model("Order", orderSchema);
export default Order;
