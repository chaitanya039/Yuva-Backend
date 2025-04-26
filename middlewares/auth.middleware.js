import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import AsyncHandler from '../utils/AsyncHandler.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

// ✅ Middleware to protect routes for Admin (User) only
export const protectUser = AsyncHandler(async (req, res, next) => {
  let token;

  // 1. Get token from cookie or Authorization header
  if (req.cookies?.user_token) {
    // Check for user_token cookie (admin)
    token = req.cookies.user_token;
    console.log("User token found in cookies:", token);
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    // If token is in the Authorization header (fallback)
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. If token not found, throw error
  if (!token) throw new ApiError(401, 'Not authorized, token missing');

  // 3. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // 4. Check token type and attach user (admin) data
  if (decoded.type === 'user') {
    const user = await User.findById(decoded.id).select('-password').populate('role');
    if (!user) throw new ApiError(401, 'User not found');
    req.user = user; // Attach user (admin) to the request object
  } else {
    throw new ApiError(401, 'Invalid user type, admin required');
  }

  // Proceed to next middleware or route handler
  next();
});

// ✅ Middleware to protect routes for Customer only
export const protectCustomer = AsyncHandler(async (req, res, next) => {
  let token;

  // 1. Get token from cookie or Authorization header
  if (req.cookies?.customer_token) {
    // Check for customer_token cookie (customer)
    token = req.cookies.customer_token;
    console.log("Customer token found in cookies:", token);
  } else if (req.headers.authorization?.startsWith('Bearer')) {
    // If token is in the Authorization header (fallback)
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. If token not found, throw error
  if (!token) throw new ApiError(401, 'Not authorized, token missing');

  // 3. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  // 4. Check token type and attach customer data
  if (decoded.type === 'customer') {
    const customer = await Customer.findById(decoded.id).select('-password');
    if (!customer) throw new ApiError(401, 'Customer not found');
    req.customer = customer; // Attach customer to the request object
  } else {
    throw new ApiError(401, 'Invalid user type, customer required');
  }

  // Proceed to next middleware or route handler
  next();
});

// ✅ Common Logout Logic for User (Admin) and Customer
export const logout = (req, res) => {
  // Check if it's a user or customer based on the type (role)
  if (req.user) {
    // Clear user_token if logged in as a user (admin)
    res.clearCookie("user_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
    });
  } else if (req.customer) {
    // Clear customer_token if logged in as a customer
    res.clearCookie("customer_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
    });
  }

  // Return successful logout response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
};
