import dotenv from "dotenv";
import axios from "axios";
import Customer from "../models/Customer.js";

dotenv.config(); // Load .env variables

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("🟢 MongoDB connected");
  runBackfill();
}).catch((err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

// Get coordinates from city
const getCoordinatesFromCity = async (city) => {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: city,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "Yuva-Plastics-Dashboard/1.0"
      }
    });

    if (res.data.length > 0) {
      const { lat, lon } = res.data[0];
      return {
        type: "Point",
        coordinates: [parseFloat(lon), parseFloat(lat)],
      };
    }

    return null;
  } catch (err) {
    console.error(`❌ Error geocoding "${city}":`, err.message);
    return null;
  }
};

// Main logic
const runBackfill = async () => {
  try {
    const customers = await Customer.find({ city: { $exists: true }, location: { $exists: false } });

    console.log(`🔍 Found ${customers.length} customers without location`);

    for (const customer of customers) {
      if (!customer.city) continue;

      const location = await getCoordinatesFromCity(customer.city);

      if (location) {
        customer.location = location;
        await customer.save();
        console.log(`✅ Updated ${customer.name} (${customer.city}) with location`);
      } else {
        console.log(`⚠️  Could not geocode: ${customer.city}`);
      }

      // Wait 1 second to avoid hitting API rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✅ Backfill complete");
    process.exit();
  } catch (error) {
    console.error("❌ Error in backfill:", error.message);
    process.exit(1);
  }
};
