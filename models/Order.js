import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  subtotal: { type: Number, required: true }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [OrderItemSchema],
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'placed'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now }
  }],
  totalAmount: { type: Number, required: true },
  deliveryCharge: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  placedAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date }
}, { timestamps: true });

OrderSchema.index({ customerId: 1, status: 1, placedAt: -1 });
OrderSchema.index({ restaurantId: 1, status: 1, placedAt: -1 });

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
