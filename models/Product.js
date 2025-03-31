import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: String,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  priceRetail: {
    type: Number,
    required: true
  },
  priceWholesale: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  unit: {
    type: String,
    enum: ['meter', 'kg', 'piece', 'roll', 'sq.m'],
    default: 'meter'
  },
  sku: String,
  image: String,
  imagePublicId: String,

  // ✅ Added GSM field
  gsm: {
    type: Number,
    default: 100,
    min: [100, 'GSM must be at least 100'],
    required: true
  }

}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;
