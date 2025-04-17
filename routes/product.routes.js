import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByCustomer,
  getProductsByCategoryId,
  getProductsWithBadges
} from "../controllers/product.controller.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// /api/v1/products
router.post('/', upload.single('image'), createProduct);
router.get("/", getAllProducts);
router.get("/with-badges", getProductsWithBadges);
router.get("/by-customer/:customerId", getProductsByCustomer);
router.get("/category/:categoryId/products", getProductsByCategoryId);
router.get("/:id", getProductById);
router.put("/:id", upload.single('image'), updateProduct);
router.delete("/:id", deleteProduct);

export default router;
