import mongoose from 'mongoose';

const DeliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  routeData: { type: mongoose.Schema.Types.Mixed }, // GeoJSON FeatureCollection
  estimatedTime: { type: Number }, // in minutes
  actualTime: { type: Number }, // in minutes
  status: {
    type: String,
    enum: ['assigned', 'picked_up', 'en_route', 'delivered'],
    default: 'assigned'
  },
  partnerLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  }
}, { timestamps: true });

export default mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);
