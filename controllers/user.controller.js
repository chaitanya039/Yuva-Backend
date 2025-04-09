// controllers/user.controller.js

import User from '../models/User.js';
import Role from '../models/Role.js';
import AsyncHandler from '../utils/AsyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

// @desc    Get all users with optional filtering (by role, name, email, status)
export const getAllUsers = AsyncHandler(async (req, res) => {
  const { search, role, status } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) {
    const roleObj = await Role.findOne({ name: role });
    if (roleObj) filter.role = roleObj._id;
  }

  if (status) {
    filter.status = status === 'active';
  }

  const users = await User.find(filter).populate('role');
  res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
});

// @desc    Create new user (SuperAdmin only)
export const createUser = AsyncHandler(async (req, res) => {
  const { name, email, password, roleName, isSuperAdmin = false } = req.body;

  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(400, "User already exists");

  const role = await Role.findOne({ name: roleName });
  if (!role) throw new ApiError(400, "Invalid role name");

  let profileImgUrl = "";
  if (req.file) {
    const cloudRes = await uploadOnCloudinary(req.file.path, "Users");
    profileImgUrl = cloudRes.secure_url;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role._id,
    isSuperAdmin,
    profileImg: profileImgUrl,
  });

  res.status(201).json(new ApiResponse(201, user, "User created successfully"));
});

// @desc    Update user
export const updateUser = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, roleName, isSuperAdmin } = req.body;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.isSuperAdmin && req.user._id.toString() !== user._id.toString()) {
    throw new ApiError(403, "Only Super Admin can update their own account");
  }

  if (roleName) {
    const role = await Role.findOne({ name: roleName });
    if (!role) throw new ApiError(400, "Invalid role");
    user.role = role._id;
  }

  if (name) user.name = name;
  if (email) user.email = email;
  if (typeof isSuperAdmin === 'boolean') user.isSuperAdmin = isSuperAdmin;

  await user.save();
  res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});

// @desc    Delete user (except SuperAdmin)
export const deleteUser = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) throw new ApiError(404, "User not found");
  if (user.isSuperAdmin) throw new ApiError(403, "Cannot delete Super Admin");

  await user.deleteOne();
  res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});

// @desc    Get user by ID
export const getUserById = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).populate("role");
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

// @desc    Toggle Active/Inactive status
export const toggleUserStatus = AsyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) throw new ApiError(404, "User not found");
  if (user.isSuperAdmin) throw new ApiError(403, "Cannot deactivate Super Admin");

  user.status = !user.status;
  await user.save();

  res.status(200).json(new ApiResponse(200, user, `User status updated to ${user.status ? 'active' : 'inactive'}`));
});
