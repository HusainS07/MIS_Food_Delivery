import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    
    const order = await Order.findById(id).populate('restaurantId', 'name address location').populate('customerId', 'fullName phone address');
    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Fetch order error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
