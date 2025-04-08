import Product from "../models/Product.js";
import StockHistory from "../models/StockHistory.js";
import ApiResponse from "../utils/ApiResponse.js";
import moment from "moment";
import Order from "../models/Order.js";

// UPDATE STOCK QUANTITY
export const updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { action, quantity, remarks } = req.body;
    const userId = req.user._id; // ensure you're using auth middleware

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Product not found"));
    }

    const previousStock = product.stock;
    let newStock;

    if (action === "add") {
      newStock = previousStock + quantity;
    } else if (action === "reduce") {
      if (previousStock < quantity) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Insufficient stock to reduce"));
      }
      newStock = previousStock - quantity;
    } else {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid stock action"));
    }

    product.stock = newStock;
    await product.save();

    // Log the change in StockHistory
    await StockHistory.create({
      product: product._id,
      action,
      quantity,
      previousStock,
      newStock,
      remarks,
      updatedBy: userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { newStock }, "Stock updated successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// GET STOCK HISTORY BY PRODUCT ID
export const getStockHistory = async (req, res) => {
  try {
    const { productId } = req.params;

    const logs = await StockHistory.find({ product: productId })
      .sort({ createdAt: -1 })
      .populate("updatedBy", "name email");

    return res
      .status(200)
      .json(new ApiResponse(200, logs, "Stock history fetched"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// Inventory Summary for Dashboard
export const getInventoryOverview = async (req, res) => {
  try {
    const products = await Product.find();

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock < 10).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalProducts,
          totalStock,
          lowStock,
          outOfStock,
        },
        "Inventory overview fetched"
      )
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

export const getRecentStockUpdates = async (req, res) => {
  try {
    const updates = await StockHistory.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("product", "name sku")
      .populate("updatedBy", "name");

    return res
      .status(200)
      .json(new ApiResponse(200, updates, "Recent stock updates fetched"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

export const getStockActivityChartData = async (req, res) => {
  try {
    const today = moment().startOf("day");
    const last7Days = [];

    for (let i = 6; i >= 0; i--) {
      const date = today.clone().subtract(i, "days");
      const nextDate = date.clone().add(1, "day");

      const logs = await StockHistory.find({
        createdAt: { $gte: date.toDate(), $lt: nextDate.toDate() },
      });

      const added = logs
        .filter((l) => l.action === "add")
        .reduce((sum, l) => sum + l.quantity, 0);

      const reduced = logs
        .filter((l) => l.action === "reduce")
        .reduce((sum, l) => sum + l.quantity, 0);

      last7Days.push({
        date: date.format("MMM D"),
        added,
        reduced,
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(200, last7Days, "Stock activity chart data"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

export const getOrderSnapshot = async (req, res) => {
  try {
    const orders = await Order.find();

    const pending = orders.filter((o) => o.status === "Pending").length;
    const completed = orders.filter((o) => o.status === "Completed").length;
    const processing = orders.filter((o) => o.status === "Processing").length;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          pending,
          completed,
          processing,
        },
        "Order snapshot fetched"
      )
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

export const getMostUpdatedProducts = async (req, res) => {
  try {
    const agg = await StockHistory.aggregate([
      { $group: { _id: "$product", changes: { $sum: 1 } } },
      { $sort: { changes: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ]);

    const result = agg.map((item) => ({
      name: item.product.name,
      sku: item.product.sku,
      changes: item.changes,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Most updated products"));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// 📦 GET LOW STOCK PRODUCTS
export const getLowStockProducts = async (req, res) => {
    try {
      const products = await Product.find({ stock: { $gt: 0, $lt: 10 } }).populate("category");
  
      return res.status(200).json(
        new ApiResponse(200, products, "Low stock products fetched")
      );
    } catch (error) {
      return res.status(500).json(new ApiResponse(500, {}, error.message));
    }
  };
