// ✅ UPDATED ORDER CONTROLLER with `discount` support

import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Product from "../models/Product.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Parser } from "json2csv";

// CREATE ORDER
export const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      items,
      specialInstructions,
      discount = 0,
      amountPaid = 0,
    } = req.body;
    const customerIdFinal = req.customer?._id || customerId;
    const userId = req.user?._id || null;

    if (!customerIdFinal) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Customer ID is required"));
    }

    const customer = await Customer.findById(customerIdFinal);
    if (!customer) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Customer not found"));
    }

    const customerType = customer.type;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product)
        return res
          .status(404)
          .json(new ApiResponse(404, {}, "Product not found"));

      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`
            )
          );
      }
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
      const price =
        customerType === "Wholesaler"
          ? product.priceWholesale
          : product.priceRetail;
      const total = price * item.quantity;
      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: total,
      });
      totalAmount += total;
    }

    const netPayable = totalAmount - discount;
    const finalAmountPaid = Math.min(amountPaid, netPayable);
    const balanceRemaining = netPayable - finalAmountPaid;

    let status = "Pending";
    let paymentStatus = "Unpaid";

    if (finalAmountPaid === 0) {
      paymentStatus = "Unpaid";
      status = "Pending";
    } else if (balanceRemaining > 0) {
      paymentStatus = "Partially Paid";
      status = "Processing";
    } else {
      paymentStatus = "Paid";
      status = "Completed";
    }

    const order = await Order.create({
      customer: customerIdFinal,
      user: userId,
      totalAmount,
      discount,
      status,
      specialInstructions,
      statusHistory: [{ status }],
      payment: {
        amountPaid: finalAmountPaid,
        balanceRemaining,
        status: paymentStatus,
      },
    });

    for (let item of orderItems) {
      await OrderItem.create({ ...item, order: order._id });
    }

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { _id: order._id, orderId: order.orderId },
          "Order created successfully"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// UPDATE ORDERS
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items, specialInstructions, discount, amountPaid } =
      req.body;

    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json(new ApiResponse(404, {}, "Order not found"));

    // 1. Status History
    const originalStatus = order.status;

    // 2. Handle Order Items Update
    if (items && Array.isArray(items)) {
      await OrderItem.deleteMany({ order: order._id });

      let totalAmount = 0;
      const customer = await Customer.findById(order.customer);
      const customerType = customer?.type || "Retailer";

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const unitPrice =
          customerType === "Wholesaler"
            ? product.priceWholesale
            : product.priceRetail;
        const total = unitPrice * item.quantity;
        totalAmount += total;

        await OrderItem.create({
          order: order._id,
          product: item.product,
          quantity: item.quantity,
          unitPrice,
          totalPrice: total,
        });
      }

      // Update order total and discount
      order.totalAmount = totalAmount;
      if (discount !== undefined) order.discount = discount;
    }

    // 3. Handle Discount-Only Update
    if (discount !== undefined && !items) {
      order.discount = discount;
    }

    // 4. Special Instructions
    if (specialInstructions !== undefined)
      order.specialInstructions = specialInstructions;

    // 5. Auto-update Payment Section
    const netPayable = order.totalAmount - (order.discount || 0);

    // Ensure payment object exists
    order.payment = order.payment || {};

    // 🟢 Accept updated amountPaid from frontend
    if (amountPaid !== undefined) {
      order.payment.amountPaid = Math.min(amountPaid, netPayable);
    }

    const paid = order.payment.amountPaid || 0;
    const remaining = netPayable - paid;

    order.payment.balanceRemaining = remaining;

    if (paid === 0) {
      order.payment.status = "Unpaid";
      order.status = "Pending";
    } else if (remaining > 0) {
      order.payment.status = "Partially Paid";
      order.status = "Processing";
    } else {
      order.payment.status = "Paid";
      order.status = "Completed";
    }

    // Push to statusHistory only if status changed
    if (order.status !== originalStatus) {
      order.statusHistory.push({ status: order.status });
    }

    await order.save();

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order updated successfully"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// UPDATE ORDER PAYMENT (Amount Received)
export const updateOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid } = req.body;

    if (amountPaid === undefined || amountPaid < 0) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Valid amountPaid is required"));
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json(new ApiResponse(404, {}, "Order not found"));
    }

    // Initialize payment field if missing
    if (!order.payment) {
      order.payment = {
        amountPaid: 0,
        balanceRemaining: order.totalAmount - order.discount,
        status: "Unpaid",
      };
    }

    // Update payment
    order.payment.amountPaid += amountPaid;

    const netPayable = order.totalAmount - (order.discount || 0);
    order.payment.balanceRemaining = netPayable - order.payment.amountPaid;

    // Auto-update payment and order status
    if (order.payment.amountPaid === 0) {
      order.payment.status = "Unpaid";
      order.status = "Pending";
    } else if (order.payment.balanceRemaining > 0) {
      order.payment.status = "Partially Paid";
      order.status = "Processing";
    } else {
      order.payment.status = "Paid";
      order.status = "Completed";
    }

    await order.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          order,
          `Payment of ₹${amountPaid} recorded successfully`
        )
      );
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// GET ALL ORDERS
export const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      customerType,
      status,
      paymentStatus, // 🔹 NEW
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (page - 1) * limit;

    // 🔹 Build Filters
    const customerFilter = customerType ? { type: customerType } : {};
    const orderFilter = {};

    if (status) orderFilter.status = status;
    if (paymentStatus) orderFilter["payment.status"] = paymentStatus; // 🔹 NEW: Payment status filter

    // 🔹 Search by customer name
    const customers = await Customer.find({
      ...customerFilter,
      name: { $regex: search, $options: "i" },
    }).select("_id");

    const customerIds = customers.map((c) => c._id);

    // 🔹 Count and Fetch Orders
    const total = await Order.countDocuments({
      ...orderFilter,
      customer: { $in: customerIds },
    });

    const orders = await Order.find({
      ...orderFilter,
      customer: { $in: customerIds },
    })
      .populate("customer user")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    return res
      .status(200)
      .json(new ApiResponse(200, { orders, total }, "Filtered orders"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// GET ORDER DETAILS
export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customer user");
    if (!order)
      return res.status(404).json(new ApiResponse(404, {}, "Order not found"));

    const items = await OrderItem.find({ order: order._id }).populate(
      "product"
    );
    return res
      .status(200)
      .json(new ApiResponse(200, { order, items }, "Order details"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// DELETE ORDER
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json(new ApiResponse(404, {}, "Order not found"));

    await OrderItem.deleteMany({ order: order._id });
    await Order.deleteOne({ _id: order._id });

    return res.status(200).json(new ApiResponse(200, {}, "Order deleted"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// ORDERS BY TYPE
export const getOrdersByCustomerType = async (req, res) => {
  try {
    const { type } = req.params;
    const customers = await Customer.find({ type }).select("_id");

    const orders = await Order.find({
      customer: { $in: customers.map((c) => c._id) },
    })
      .populate("customer")
      .sort({ createdAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, orders, `${type} orders fetched`));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// GET RECENT ORDERS
export const getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("customer");

    const recent = orders.map((order) => ({
      id: order._id,
      orderId: order.orderId,
      customerName: order.customer?.name || "Unknown",
      amount: order.totalAmount,
      discount: order.discount || 0,
      status: order.status,
      date: order.createdAt,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, recent, "Recent orders fetched"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// EXPORT ORDERS TO CSV
export const exportOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer")
      .sort({ createdAt: -1 });
    const data = [];

    for (const order of orders) {
      const items = await OrderItem.find({ order: order._id }).populate(
        "product"
      );

      items.forEach((item) => {
        data.push({
          OrderID: order.orderId,
          OrderDate: order.createdAt.toISOString().split("T")[0],
          Customer: order.customer?.name || "N/A",
          Email: order.customer?.email || "N/A",
          CustomerType: order.customer?.type || "N/A",
          Product: item.product?.name || "N/A",
          Quantity: item.quantity,
          UnitPrice: item.unitPrice,
          TotalPrice: item.totalPrice,
          Discount: order.discount || 0,
          OrderTotal: order.totalAmount,
          Status: order.status,
        });
      });
    }

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment("orders_export.csv");
    return res.send(csv);
  } catch (err) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Failed to export orders"));
  }
};
