import Customer from "../models/Customer.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import axios from "axios";

// 📍 Helper: Fetch Lat/Lng from City using OpenStreetMap Nominatim API
const getCoordinatesFromCity = async (city) => {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: city,
        format: "json",
        limit: 1
      },
      headers: {
        "User-Agent": "Yuva-Plastics-Dashboard/1.0"
      }
    });

    if (res.data.length > 0) {
      const { lat, lon } = res.data[0];
      return {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)]
      };
    }
    return null;
  } catch (err) {
    console.error("Geocoding failed:", err.message);
    return null;
  }
};

// 🔹 Create a new customer
export const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, password, type, city } = req.body;
    let profileImgUrl = "", profileImgPublicId = "";

    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(400).json(new ApiResponse(400, {}, "Customer already exists"));
    }

    if (req.file) {
      const cloudinaryResponse = await uploadOnCloudinary(req.file?.path, "Customers");
      if (!cloudinaryResponse) {
        return res.status(500).json(new ApiResponse(500, {}, "Image upload failed"));
      }
      profileImgUrl = cloudinaryResponse.secure_url;
      profileImgPublicId = cloudinaryResponse.public_id;
    }

    const location = await getCoordinatesFromCity(city);

    const customer = await Customer.create({
      name,
      email,
      phone,
      password,
      type,
      city,
      profileImg: profileImgUrl,
      profileImgPublicId,
      location
    });

    return res.status(201).json(new ApiResponse(201, customer, "Customer created successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Get all customers (with filters, search, pagination, sort)
export const getAllCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", type = "" } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Customer.countDocuments(filter)
    ]);

    return res.status(200).json(new ApiResponse(200, { customers, total }, "Customers fetched successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Get a single customer by ID
export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json(new ApiResponse(404, {}, "Customer not found"));

    return res.status(200).json(new ApiResponse(200, customer, "Customer found"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Update customer (Admin)
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json(new ApiResponse(404, {}, "Customer not found"));

    // Upload image if exists
    let profileImgUrl = customer.profileImg;
    let profileImgPublicId = customer.profileImgPublicId;

    if (req.file) {
      if (profileImgPublicId) await deleteFromCloudinary(profileImgPublicId);

      const cloudinaryResponse = await uploadOnCloudinary(req.file.path, "Customers");
      if (!cloudinaryResponse) {
        return res.status(500).json(new ApiResponse(500, {}, "Image upload failed"));
      }

      profileImgUrl = cloudinaryResponse.secure_url;
      profileImgPublicId = cloudinaryResponse.public_id;
    }

    // Update fields
    if (updates.city && updates.city !== customer.city) {
      const newLocation = await getCoordinatesFromCity(updates.city);
      customer.location = newLocation;
    }

    customer.name = updates.name ?? customer.name;
    customer.email = updates.email ?? customer.email;
    customer.phone = updates.phone ?? customer.phone;
    customer.type = updates.type ?? customer.type;
    customer.city = updates.city ?? customer.city;
    customer.profileImg = profileImgUrl;
    customer.profileImgPublicId = profileImgPublicId;

    await customer.save();

    return res.status(200).json(new ApiResponse(200, customer, "Customer updated successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};

// 🔹 Delete customer (Admin)
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json(new ApiResponse(404, {}, "Customer not found"));

    if (customer.profileImgPublicId) {
      await deleteFromCloudinary(customer.profileImgPublicId);
    }

    await customer.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, "Customer deleted successfully"));
  } catch (error) {
    return res.status(500).json(new ApiResponse(500, {}, error.message));
  }
};
