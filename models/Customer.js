import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    type: {
      type: String,
      enum: ["Retailer", "Wholesaler"],
      required: true,
    },
    city: String,
    profileImg: {
      type: String,
      default: "",
    },
    profileImgPublicId: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        index: "2dsphere",
      },
    },
  },
  {
    timestamps: true,
  }
);

// 🔒 Hash password + 🌐 Geocode City to Coordinates
customerSchema.pre("save", async function (next) {
  // Hash password if modified
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Geocode location if city is modified
  if (this.isModified("city") && this.city) {
    try {
      const res = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: {
          city: this.city,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "Yuva-Plastics-Dashboard/1.0 (admin@yuvaplastics.com)",
        },
      });

      if (res.data.length > 0) {
        const { lat, lon } = res.data[0];
        this.location = {
          type: "Point",
          coordinates: [parseFloat(lon), parseFloat(lat)],
        };
      } else {
        // Invalid city: throw to notify frontend
        const err = new Error("Invalid city name");
        err.statusCode = 400;
        return next(err);
      }
    } catch (err) {
      console.error("Geocoding error:", err.message);
      return next(new Error("City geocoding failed"));
    }
  }

  next();
});

// 🔐 Compare Password
customerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;
