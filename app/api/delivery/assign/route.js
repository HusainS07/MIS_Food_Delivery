import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Delivery from '@/models/Delivery';
import User from '@/models/User';
import Order from '@/models/Order';
import Restaurant from '@/models/Restaurant';
import { optimizeRoute, haversineDistance } from '@/lib/routeOptimizer';
import { getIO } from '@/lib/socket';

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { orderId } = body;

    const order = await Order.findById(orderId);
    if (!order) return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });

    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant) return NextResponse.json({ success: false, message: 'Restaurant not found' }, { status: 404 });

    const restLat = restaurant.location.coordinates[1];
    const restLng = restaurant.location.coordinates[0];

    // Find available delivery partners
    const partners = await User.find({ role: 'delivery_partner', availability: 'available' });
    
    if (partners.length === 0) {
      return NextResponse.json({ success: false, message: 'No delivery partners available' }, { status: 400 });
    }

    // Find nearest partner
    let nearestPartner = null;
    let minDistance = Infinity;

    for (const partner of partners) {
      // In a real app, partner's last location would be updated via socket/redis or a location collection
      // We assume partner.address.coordinates has their last known location for simplicity
      if (partner.address && partner.address.coordinates) {
        const dist = haversineDistance(
          restLat, restLng,
          partner.address.coordinates.lat, partner.address.coordinates.lng
        );
        // within 5km
        if (dist <= 5 && dist < minDistance) {
          minDistance = dist;
          nearestPartner = partner;
        }
      }
    }

    if (!nearestPartner) {
      // Fallback: pick the first one if none within 5km for demo purposes
      nearestPartner = partners[0];
    }

    // Get customer address for route calculation
    const customer = await User.findById(order.customerId);
    const custLat = customer.address.coordinates.lat;
    const custLng = customer.address.coordinates.lng;

    // Call OpenRouteService
    const routeData = await optimizeRoute(
      { lat: restLat, lng: restLng },
      { lat: custLat, lng: custLng }
    );

    // Create delivery
    const delivery = await Delivery.create({
      orderId,
      partnerId: nearestPartner._id,
      routeData,
      estimatedTime: 30, // Default or parsed from routeData
      status: 'assigned',
      partnerLocation: {
        lat: nearestPartner.address?.coordinates?.lat || restLat,
        lng: nearestPartner.address?.coordinates?.lng || restLng,
        updatedAt: new Date()
      }
    });

    // Mark partner as on_delivery
    nearestPartner.availability = 'on_delivery';
    await nearestPartner.save();

    // Emit socket event
    const io = getIO();
    io.to(`order:${orderId}`).emit('order:status_update', {
      status: 'assigned',
      partnerId: nearestPartner._id
    });

    return NextResponse.json({ success: true, delivery });
  } catch (error) {
    console.error('Delivery assign error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
