import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Delivery from '@/models/Delivery';
import { getRedisClient } from '@/lib/redis';
import { getIO } from '@/lib/socket';

export async function PATCH(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = params; // deliveryId
    const body = await req.json();
    const { lat, lng } = body;

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return NextResponse.json({ success: false, message: 'Delivery not found' }, { status: 404 });
    }

    // Update in MongoDB
    delivery.partnerLocation = { lat, lng, updatedAt: new Date() };
    await delivery.save();

    // Update in Redis
    const redis = await getRedisClient();
    await redis.set(`partner:${delivery.partnerId}:location`, JSON.stringify({ lat, lng }), { EX: 60 });

    // Broadcast is usually handled natively by socket.io from the client, 
    // but if the client hits this REST endpoint instead of emitting socket event directly, we broadcast it here
    const io = getIO();
    io.to(`order:${delivery.orderId}`).emit('order:location_update', { lat, lng, timestamp: new Date() });
    io.to('operations:live').emit('ops:partner_location', { partnerId: delivery.partnerId, lat, lng, timestamp: new Date() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Location update error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
