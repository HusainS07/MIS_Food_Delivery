import mongoose from 'mongoose';

const RecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  score: { type: Number, required: true },
  reason: { type: String },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

RecommendationSchema.index({ userId: 1, generatedAt: -1 });

export default mongoose.models.Recommendation || mongoose.model('Recommendation', RecommendationSchema);
