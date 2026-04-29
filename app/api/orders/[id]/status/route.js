import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getIO } from '@/lib/socket';

export async function PATCH(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await req.json();
    const { status } = body;
    
    const role = req.headers.get('x-user-role');
    if (role === 'customer') {
      return NextResponse.json({ success: false, message: 'Customers cannot update order status' }, { status: 403 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date() });
    
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Emit socket event to order room
    const io = getIO();
    io.to(`order:${id}`).emit('order:status_update', {
      status,
      timestamp: new Date()
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
