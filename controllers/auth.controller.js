import User from "../models/User.js";
import Customer from "../models/Customer.js";
import Role from "../models/Role.js";
import generateToken from "../utils/jwt.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// ==================== USER CONTROLLERS ====================

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, roleName } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User already exists"));

    const role = await Role.findOne({ name: roleName });
    if (!role)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid role name"));

    let profileImgUrl = "";
    if (req.file) {
      const cloudRes = await uploadOnCloudinary(req.file?.path, "Users");
      profileImgUrl = cloudRes.secure_url;
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role._id,
      profileImg: profileImgUrl,
    });

    const token = generateToken(user._id, "user");

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: role.name,
          profileImg: user.profileImg,
          token,
        },
        "User registered successfully"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("role");
    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Invalid credentials"));
    }

    const token = generateToken(user._id, "user");

    // Set a cookie specific to user
    res.cookie("user_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          profileImg: user.profileImg,
          token,
        },
        "Login successful"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// ==================== CUSTOMER CONTROLLERS ====================

export const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, password, type, city } = req.body;

    const exists = await Customer.findOne({ email });
    if (exists)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Customer already exists"));

    let profileImgUrl = "";
    if (req.file) {
      const cloudRes = await uploadOnCloudinary(req.file?.path, "Customers");
      profileImgUrl = cloudRes.secure_url;
    }

    const customer = await Customer.create({
      name,
      email,
      phone,
      password,
      type,
      city,
      profileImg: profileImgUrl,
    });

    const token = jwt.sign(
      { id: customer._id, type: "customer" },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set a cookie specific to customer
    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          type: customer.type,
          city: customer.city,
          profileImg: customer.profileImg,
          token,
        },
        "Customer registered successfully"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer || !(await customer.matchPassword(password))) {
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Invalid credentials"));
    }

    const token = jwt.sign(
      { id: customer._id, type: "customer" },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set a cookie specific to customer
    res.cookie("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          type: customer.type,
          city: customer.city,
          profileImg: customer.profileImg,
          token,
        },
        "Login successful"
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// ==================== PROFILE ====================

// ==================== USER PROFILE ====================

export const getCurrentUser = async (req, res) => {
  try {
    if (req.user) {
      const { _id, name, email, profileImg, isSuperAdmin, role } = req.user;
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            _id,
            name,
            email,
            profileImg,
            isSuperAdmin,
            role: role?.name || null,
          },
          "Logged-in user (admin) profile"
        )
      );
    } else {
      return res.status(401).json(new ApiResponse(401, {}, "Not authorized"));
    }
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// ==================== CUSTOMER PROFILE ====================

export const getCustomerProfile = async (req, res) => {
  try {
    if (req.customer) {
      const { _id, name, email, profileImg, type, phone, city, location } =
        req.customer;
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            _id,
            name,
            email,
            profileImg,
            type,
            phone,
            city,
            location,
          },
          "Logged-in customer profile"
        )
      );
    } else {
      return res.status(401).json(new ApiResponse(401, {}, "Not authorized"));
    }
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};


// ==================== COMMON LOGOUT ====================

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

