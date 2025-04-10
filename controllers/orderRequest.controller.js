import OrderRequest from "../models/OrderRequest.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import ApiResponse from "../utils/ApiResponse.js";

// 🔸 Customer requests order
export const createOrderRequest = async (req, res) => {
  try {
    const { items, note, specialInstructions } = req.body;

    if (!items || !items.length) {
      return res.status(400).json(new ApiResponse(400, {}, "No items provided"));
    }

    const orderRequest = await OrderRequest.create({
      customer: req.customer._id,
      items,
      note,
      specialInstructions,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, orderRequest, "Order request submitted"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Admin approves request → Order is created
export const approveOrderRequest = async (req, res) => {
  try {
    const request = await OrderRequest.findById(req.params.id);
    if (!request || request.status !== "Pending") {
      return res.status(400).json(new ApiResponse(400, {}, "Invalid or already processed request"));
    }

    const customer = await Customer.findById(request.customer);
    if (!customer) {
      return res.status(404).json(new ApiResponse(404, {}, "Customer not found"));
    }

    const customerType = customer.type;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of request.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const unitPrice = customerType === "Wholesaler" ? product.priceWholesale : product.priceRetail;
      const total = unitPrice * item.quantity;

      if (product.stock < item.quantity) {
        return res.status(400).json(new ApiResponse(400, {}, `Insufficient stock for ${product.name}`));
      }

      product.stock -= item.quantity;
      await product.save();

      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        unitPrice,
        totalPrice: total,
      });

      totalAmount += total;
    }

    const order = await Order.create({
      customer: request.customer,
      user: req.user._id,
      totalAmount,
      status: "Processing",
      specialInstructions: request.specialInstructions || "",
    });

    for (const item of orderItems) {
      await OrderItem.create({ ...item, order: order._id });
    }

    request.status = "Approved";
    await request.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { orderId: order._id, displayOrderId: order.orderId },
          "Order approved and created"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Admin rejects request
export const rejectOrderRequest = async (req, res) => {
  try {
    const request = await OrderRequest.findById(req.params.id);
    if (!request || request.status !== "Pending") {
      return res.status(400).json(new ApiResponse(400, {}, "Invalid or already processed request"));
    }

    request.status = "Rejected";
    await request.save();

    return res.status(200).json(new ApiResponse(200, {}, "Order request rejected"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Admin fetches order requests
export const getAllOrderRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", sort = "newest" } = req.query;
    const skip = (page - 1) * limit;
    const regex = new RegExp(search, "i");

    const matchStage = { status: { $in: ["Pending", "Rejected"] } };

    const searchStage = search
      ? {
          $or: [
            { "customer.name": regex },
            { "customer.email": regex },
            { "items.product.name": regex },
          ],
        }
      : {};

    const pipeline = [
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "items.product",
        },
      },
      { $unwind: { path: "$items.product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          customer: { $first: "$customer" },
          createdAt: { $first: "$createdAt" },
          status: { $first: "$status" },
          note: { $first: "$note" },
          specialInstructions: { $first: "$specialInstructions" },
          items: {
            $push: {
              product: "$items.product",
              quantity: "$items.quantity",
            },
          },
        },
      },
      { $match: { ...matchStage, ...searchStage } },
      { $sort: sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 } },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
    ];

    const data = await OrderRequest.aggregate(pipeline);
    const countResult = await OrderRequest.aggregate([
      ...pipeline.slice(0, -2),
      { $count: "total" },
    ]);

    const total = countResult[0]?.total || 0;

    return res
      .status(200)
      .json(new ApiResponse(200, { requests: data, total }, "Order requests fetched"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};
