import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",");

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      console.log("CORS request from:", origin);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import authRoutes from "./routes/auth.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import orderRequestRoutes from "./routes/orderRequest.routes.js";
import invoiceRoutes from "./routes/invoice.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import reportRoutes from "./routes/report.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import paymentAnalysisRoutes from "./routes/payment.analysis.routes.js";
import userRoutes from "./routes/user.routes.js";

// Route Middleware
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/order-requests", orderRequestRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/payments", paymentAnalysisRoutes);
app.use("/api/v1/users", userRoutes);

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export { app };
