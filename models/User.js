import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, required: false },
  role: { 
    type: String, 
    enum: ['customer', 'delivery_partner', 'restaurant_manager', 'admin'],
    required: true,
    default: 'customer'
  },
  address: {
    street: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  preferences: [{ type: String }],
  isActive: { type: Boolean, default: true },
  availability: { 
    type: String, 
    enum: ['available', 'on_delivery', 'offline'],
    default: 'offline' // relevant for delivery partners
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
