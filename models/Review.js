import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['restaurant', 'delivery_partner'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
