import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  cuisineType: [{ type: String }],
  rating: {
    avg: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  operatingHours: {
    open: { type: String }, // e.g. "09:00"
    close: { type: String } // e.g. "22:00"
  }
}, { timestamps: true });

RestaurantSchema.index({ location: '2dsphere' });
RestaurantSchema.index({ name: 'text', cuisineType: 'text' });

export default mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
