import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import AsyncHandler from '../utils/AsyncHandler.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';

// ✅ Middleware to protect any route
export const protect = AsyncHandler(async (req, res, next) => {
  let token;

  // 1. Get token from cookie or Authorization header
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer')) {
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

  // 4. Check token type and attach user or customer
  if (decoded.type === 'user') {
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('role');
    if (!user) throw new ApiError(401, 'User not found');
    req.user = user;
  } else if (decoded.type === 'customer') {
    const customer = await Customer.findById(decoded.id).select('-password');
    if (!customer) throw new ApiError(401, 'Customer not found');
    req.customer = customer;
  } else {
    throw new ApiError(401, 'Invalid user type');
  }

  next();
});
