import OrderRequest from "../models/OrderRequest.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import ApiResponse from "../utils/ApiResponse.js";

export const createOrderRequest = async (req, res) => {
  try {
    const { items, customerNote } = req.body;

    // Check for customer on request (must be set via auth middleware)
    if (!req.customer || !req.customer._id) {
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Unauthorized request"));
    }

    // Validate items
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "At least one item is required"));
    }

    // Validate item format
    for (const item of items) {
      if (
        !item.product ||
        typeof item.product !== "string" ||
        !item.quantity ||
        typeof item.quantity !== "number" ||
        item.quantity < 1
      ) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Invalid item structure or quantity"));
      }
    }

    // Create order
    const orderRequest = await OrderRequest.create({
      customer: req.customer._id,
      items,
      customerNote,
      status: "Pending",
      requestedAt: new Date(),
    });

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          orderRequest,
          "Order request submitted successfully"
        )
      );
  } catch (error) {
    console.error("Create Order Request Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Failed to create order request"));
  }
};

// 🔹 Admin approves request → Order is created
export const approveOrderRequest = async (req, res) => {
  try {
    const request = await OrderRequest.findById(req.params.id);
    const decisionNote = req.body.decisionNote;

    if (!request || request.status !== "Pending") {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid or already processed request"));
    }

    const customer = await Customer.findById(request.customer);
    if (!customer) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Customer not found"));
    }

    const customerType = customer.type;
    let totalAmount = 0;
    const orderItems = [];

    for (const item of request.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const unitPrice =
        customerType === "Wholesaler"
          ? product.priceWholesale
          : product.priceRetail;
      const total = unitPrice * item.quantity;

      if (product.stock < item.quantity) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, `Insufficient stock for ${product.name}`)
          );
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
      specialInstructions: request.customerNote || "",
    });

    for (const item of orderItems) {
      await OrderItem.create({ ...item, order: order._id });
    }

    request.status = "Approved";
    if (decisionNote) request.decisionNote = decisionNote;
    await request.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          orderId: order._id,
          displayOrderId: order.orderId,
        },
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
    const { decisionNote } = req.body;
    const { id } = req.params;

    // Validate ID presence
    if (!id) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Request ID is required"));
    }

    // Find the order request by ID
    const request = await OrderRequest.findById(id);

    if (!request) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Order request not found"));
    }

    // Ensure the request is still pending
    if (request.status !== "Pending") {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            `Cannot reject a request with status: ${request.status}`
          )
        );
    }

    // Update status and decision note
    request.status = "Rejected";
    if (decisionNote && typeof decisionNote === "string") {
      request.decisionNote = decisionNote;
    }

    await request.save();

    return res
      .status(200)
      .json(new ApiResponse(200, { request }, "Order request rejected"));
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "Internal server error: " + error.message)
      );
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
          requestedAt: { $first: "$requestedAt" },
          status: { $first: "$status" },
          customerNote: { $first: "$customerNote" },
          decisionNote: { $first: "$decisionNote" },
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
      .json(
        new ApiResponse(
          200,
          { requests: data, total },
          "Order requests fetched"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// @desc  Get all order requests of the currently logged-in customer
// @route GET /order-requests/my
// @access Customer (protected route)
export const getOrderRequestsByCustomer = async (req, res) => {
  try {
    const customerId = req.customer._id; // assuming req.user is the logged-in customer

    const requests = await OrderRequest.aggregate([
      {
        $match: { customer: customerId },
      },
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
          status: { $first: "$status" },
          customerNote: { $first: "$customerNote" },
          decisionNote: { $first: "$decisionNote" },
          requestedAt: { $first: "$requestedAt" },
          items: {
            $push: {
              product: "$items.product",
              quantity: "$items.quantity",
            },
          },
        },
      },
      { $sort: { requestedAt: -1 } }
    ]);

    return res.status(200).json(
      new ApiResponse(200, requests, "Order requests fetched for customer")
    );
  } catch (err) {
    return res
      .status(500)
      .json(new ApiResponse(500, {}, err.message || "Server error"));
  }
};
