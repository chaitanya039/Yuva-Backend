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
    city: {
      type: String,
    },
    profileImg: {
      type: String,
      default: "",
    },
    profileImgPublicId: String,

    // 🌍 Location field for GeoJSON point
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

// 🔒 Hash password
customerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  customerSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    // 🌐 Set location from city
    if (this.isModified("city") && this.city) {
      try {
        const res = await axios.get(
          "https://nominatim.openstreetmap.org/search",
          {
            params: {
              city: this.city,
              format: "json",
              limit: 1,
            },
            headers: {
              "User-Agent":
                "Yuva-Plastics-Dashboard/1.0 (admin@yuvaplastics.com)",
            },
          }
        );

        if (res.data.length > 0) {
          const { lat, lon } = res.data[0];
          this.location = {
            type: "Point",
            coordinates: [parseFloat(lon), parseFloat(lat)],
          };
        } else {
          // Default fallback if no result found
          this.location = {
            type: "Point",
            coordinates: [0, 0],
          };
        }
      } catch (err) {
        console.error("Geocoding error:", err.message);
        // Set to fallback location if API fails
        this.location = {
          type: "Point",
          coordinates: [0, 0],
        };
      }
    }

    next();
  });

  next();
});

// 🔐 Password match method
customerSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Customer = mongoose.model("Customer", customerSchema);
export default Customer;
