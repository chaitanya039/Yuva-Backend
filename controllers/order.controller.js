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
    const { customerId, items, specialInstructions, discount = 0 } = req.body;
    const customerIdFinal = req.customer?._id || customerId;
    const userId = req.user?._id || null;

    if (!customerIdFinal) {
      return res.status(400).json(new ApiResponse(400, {}, "Customer ID is required"));
    }

    const customer = await Customer.findById(customerIdFinal);
    if (!customer) {
      return res.status(404).json(new ApiResponse(404, {}, "Customer not found"));
    }

    const customerType = customer.type;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json(new ApiResponse(404, {}, "Product not found"));

      if (product.stock < item.quantity) {
        return res.status(400).json(new ApiResponse(400, {}, `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`));
      }
    }

    for (const item of items) {
      const product = await Product.findById(item.product);
      const price = customerType === "Wholesaler" ? product.priceWholesale : product.priceRetail;
      const total = price * item.quantity;
      product.stock -= item.quantity;
      await product.save();

      orderItems.push({ product: item.product, quantity: item.quantity, unitPrice: price, totalPrice: total });
      totalAmount += total;
    }

    const finalAmount = totalAmount - discount;
    const status = "Pending";

    const order = await Order.create({
      customer: customerIdFinal,
      user: userId,
      totalAmount: finalAmount,
      discount,
      status,
      specialInstructions,
      statusHistory: [{ status }],
    });

    for (let item of orderItems) {
      await OrderItem.create({ ...item, order: order._id });
    }

    return res.status(201).json(new ApiResponse(201, { _id: order._id, orderId: order.orderId }, "Order created successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// UPDATE ORDER
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items, specialInstructions, discount } = req.body;
    const order = await Order.findById(id);
    if (!order) return res.status(404).json(new ApiResponse(404, {}, "Order not found"));

    if (status && status !== order.status) {
      order.status = status;
      order.statusHistory.push({ status });
    }

    if (items && Array.isArray(items)) {
      await OrderItem.deleteMany({ order: order._id });

      let totalAmount = 0;
      const customer = await Customer.findById(order.customer);
      const customerType = customer?.type || "Retailer";

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const unitPrice = customerType === "Wholesaler" ? product.priceWholesale : product.priceRetail;
        const total = unitPrice * item.quantity;
        totalAmount += total;

        await OrderItem.create({ order: order._id, product: item.product, quantity: item.quantity, unitPrice, totalPrice: total });
      }

      order.totalAmount = discount ? totalAmount - discount : totalAmount;
      if (discount !== undefined) order.discount = discount;
    }

    if (specialInstructions !== undefined) order.specialInstructions = specialInstructions;
    await order.save();

    return res.status(200).json(new ApiResponse(200, order, "Order updated successfully"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// GET ALL ORDERS
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", customerType, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const skip = (page - 1) * limit;
    const customerFilter = customerType ? { type: customerType } : {};
    const orderFilter = status ? { status } : {};

    const customers = await Customer.find({ ...customerFilter, name: { $regex: search, $options: "i" } }).select("_id");
    const customerIds = customers.map((c) => c._id);

    const total = await Order.countDocuments({ ...orderFilter, customer: { $in: customerIds } });
    const orders = await Order.find({ ...orderFilter, customer: { $in: customerIds } })
      .populate("customer user")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(Number(limit));

    return res.status(200).json(new ApiResponse(200, { orders, total }, "Filtered orders"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// GET ORDER DETAILS
export const getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("customer user");
    if (!order) return res.status(404).json(new ApiResponse(404, {}, "Order not found"));

    const items = await OrderItem.find({ order: order._id }).populate("product");
    return res.status(200).json(new ApiResponse(200, { order, items }, "Order details"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// DELETE ORDER
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json(new ApiResponse(404, {}, "Order not found"));

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

    const orders = await Order.find({ customer: { $in: customers.map((c) => c._id) } })
      .populate("customer")
      .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, orders, `${type} orders fetched`));
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

    return res.status(200).json(new ApiResponse(200, recent, "Recent orders fetched"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};


// EXPORT ORDERS TO CSV
export const exportOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate("customer").sort({ createdAt: -1 });
    const data = [];

    for (const order of orders) {
      const items = await OrderItem.find({ order: order._id }).populate("product");

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
    return res.status(500).json(new ApiResponse(500, {}, "Failed to export orders"));
  }
};