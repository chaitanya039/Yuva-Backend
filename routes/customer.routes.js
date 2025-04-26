import express from "express";
import {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller.js";
import { protectUser } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// Admin-only customer management
router.post("/", protectUser, upload.single("profileImg"), createCustomer);
router.get("/", protectUser, getAllCustomers);
router.get("/:id", protectUser, getCustomerById);
router.put("/:id", protectUser, upload.single("profileImg"), updateCustomer);
router.delete("/:id", protectUser, deleteCustomer);

export default router;
