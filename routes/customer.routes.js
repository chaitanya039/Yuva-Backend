import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// Admin-only customer management
router.post("/", protect, upload.single("profileImg"), createCustomer);
router.get("/", protect, getAllCustomers);
router.get("/:id", protect, getCustomerById);
router.put("/:id", protect, upload.single("profileImg"), updateCustomer);
router.delete("/:id", protect, deleteCustomer);

export default router;
