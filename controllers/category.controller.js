import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiResponse from '../utils/ApiResponse.js';

// Create
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json(new ApiResponse(400, {}, 'Category already exists'));

    const category = await Category.create({ name, description });
    return res.status(201).json(new ApiResponse(201, category, 'Category created successfully'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// Read All
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    return res.status(200).json(new ApiResponse(200, categories, 'Fetched all categories'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// Read One
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json(new ApiResponse(404, {}, 'Category not found'));

    return res.status(200).json(new ApiResponse(200, category, 'Category fetched'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// Update
export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json(new ApiResponse(404, {}, 'Category not found'));

    return res.status(200).json(new ApiResponse(200, updated, 'Category updated successfully'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};

// Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const categoryToDelete = await Category.findById(req.params.id);
    if (!categoryToDelete) {
      return res.status(404).json(new ApiResponse(404, {}, 'Category not found'));
    }

    // 🔐 Prevent deletion of "Uncategorized"
    if (categoryToDelete.name.toLowerCase() === "uncategorized") {
      return res.status(400).json(new ApiResponse(400, {}, 'Uncategorized category cannot be deleted'));
    }

    // Find or create fallback "Uncategorized"
    let fallback = await Category.findOne({ name: "Uncategorized" });
    if (!fallback) {
      fallback = await Category.create({ name: "Uncategorized", description: "This is common category for non category products!" });
    }

    // Reassign products
    await Product.updateMany({ category: categoryToDelete._id }, { category: fallback._id });

    // Delete the category
    await categoryToDelete.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, 'Category deleted and products reassigned'));
  } catch (err) {
    return res.status(500).json(new ApiResponse(500, {}, err.message));
  }
};
