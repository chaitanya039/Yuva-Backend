// Updated Product Controller with GSM and Auto SKU

import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

// Helper to generate SKU in TAR-001 format
const generateSKU = async () => {
  const count = await Product.countDocuments();
  const skuNumber = count + 1;
  return `TAR-${skuNumber.toString().padStart(3, "0")}`;
};

// CREATE PRODUCT
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      priceRetail,
      priceWholesale,
      stock,
      unit,
      gsm,
    } = req.body;

    let imageUrl = "",
      imagePublicId = "";

    if (req.file) {
      const cloudinaryResponse = await uploadOnCloudinary(
        req.file?.path,
        "Products"
      );
      if (!cloudinaryResponse) {
        return res
          .status(500)
          .json(new ApiResponse(500, {}, "Image upload failed"));
      }
      imageUrl = cloudinaryResponse.secure_url;
      imagePublicId = cloudinaryResponse.public_id;
    }

    const sku = await generateSKU();

    const product = await Product.create({
      name,
      description,
      category,
      priceRetail,
      priceWholesale,
      stock,
      unit,
      gsm,
      sku,
      image: imageUrl,
      imagePublicId,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, product, "Product created"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// GET ALL PRODUCTS
export const getAllProducts = async (req, res) => {
  try {
    const { category, stockStatus, search, page = 1, limit = 10 } = req.query;
    let filter = {};

    if (category && category !== "all") filter.category = category;

    if (stockStatus) {
      if (stockStatus === "inStock") filter.stock = { $gt: 20 };
      else if (stockStatus === "lowStock") filter.stock = { $gt: 0, $lte: 20 };
      else if (stockStatus === "outOfStock") filter.stock = { $eq: 0 };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          products,
          total,
          page: parseInt(page),
          limit: parseInt(limit),
        },
        "Products fetched successfully"
      )
    );
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// GET SINGLE PRODUCT
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Product not found"));
    return res.status(200).json(new ApiResponse(200, product, "Product found"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// GET PRODUCTS BY CUSTOMER
export const getProductsByCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId);
    if (!customer)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Customer not found"));

    const type = customer.type;
    const products = await Product.find().select(
      "name sku gsm image priceRetail priceWholesale"
    );

    const adjustedProducts = products.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      gsm: p.gsm,
      image: p.image,
      price: type === "Wholesaler" ? p.priceWholesale : p.priceRetail,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          adjustedProducts,
          "Products fetched by customer type"
        )
      );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Product not found"));

    const {
      name,
      description,
      category,
      priceRetail,
      priceWholesale,
      stock,
      unit,
      sku,
      gsm,
    } = req.body;

    if (req.file) {
      if (product.imagePublicId)
        await deleteFromCloudinary(product.imagePublicId);
      const cloudinaryResponse = await uploadOnCloudinary(
        req.file.path,
        "Products"
      );
      if (!cloudinaryResponse)
        return res
          .status(500)
          .json(new ApiResponse(500, {}, "Image upload failed"));
      product.image = cloudinaryResponse.secure_url;
      product.imagePublicId = cloudinaryResponse.public_id;
    }

    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.category = category ?? product.category;
    product.priceRetail = priceRetail ?? product.priceRetail;
    product.priceWholesale = priceWholesale ?? product.priceWholesale;
    product.stock = stock ?? product.stock;
    product.unit = unit ?? product.unit;
    product.sku = sku ?? product.sku;
    product.gsm = gsm ?? product.gsm;

    await product.save();

    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product updated"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Product not found"));

    if (product.imagePublicId)
      await deleteFromCloudinary(product.imagePublicId);

    await product.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, "Product deleted"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// GET PRODUCTS BY CATEGORY
export const getProductsByCategoryId = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const products = await Product.find({ category: categoryId }).populate(
      "category",
      "name"
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          products,
          "Fetched all products for the given category"
        )
      );
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Failed to fetch products for category"));
  }
};

export const getProductsWithBadges = async (req, res) => {
  try {
    const products = await Product.find().populate("category", "name").lean().limit(6);
    const now = new Date();

    const data = products.map((prod) => {
      const daysSinceCreated =
        (now - new Date(prod.createdAt)) / (1000 * 60 * 60 * 24);

      let badge = "General";

      if (prod.gsm >= 200) {
        badge = "Premium";
      } else if (prod.priceRetail <= 100) {
        badge = "Best Value";
      } else if (prod.stock <= 10) {
        badge = "Low Stock";
      } else if (daysSinceCreated <= 30) {
        badge = "New";
      }

      return {
        _id: prod._id,
        name: prod.name,
        description: prod.description,
        image: prod.image,
        priceRetail: prod.priceRetail,
        priceWholesale: prod.priceWholesale,
        unit: prod.unit,
        gsm: prod.gsm,
        stock: prod.stock,
        category: prod.category,
        badge,
      };
    });

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Fetched all products with badges"));
  } catch (err) {
    console.error("Error fetching products with badges:", err);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Server error fetching product badges"));
  }
};
