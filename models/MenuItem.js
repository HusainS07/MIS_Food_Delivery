import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  isAvailable: { type: Boolean, default: true },
  imageUrl: { type: String },
  dietaryTags: [{ type: String, enum: ['veg', 'vegan', 'gluten-free', 'non-veg', 'halal'] }]
}, { timestamps: true });

MenuItemSchema.index({ name: 'text', description: 'text' });

export default mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);
