import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['Admin', 'Sales', 'InventoryManager'],
    required: true
  },
  permissions: {
    type: [String],
    default: []
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

const Role = mongoose.model('Role', roleSchema);
export default Role;
