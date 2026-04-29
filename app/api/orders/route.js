import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import MenuItem from '@/models/MenuItem';
import { getIO } from '@/lib/socket';

export async function POST(req) {
  try {
    await connectToDatabase();
    const customerId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    
    if (role !== 'customer') {
      return NextResponse.json({ success: false, message: 'Only customers can place orders' }, { status: 403 });
    }

    const body = await req.json();
    const { restaurantId, items } = body; // items: [{ menuItemId, quantity }]

    if (!restaurantId || !items || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid order data' }, { status: 400 });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return NextResponse.json({ success: false, message: `Item ${item.menuItemId} not available` }, { status: 400 });
      }
      
      const subtotal = menuItem.price * item.quantity;
      totalAmount += subtotal;
      
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        subtotal
      });
    }

    const taxAmount = totalAmount * 0.18; // 18% tax
    const deliveryCharge = 40; // Flat ₹40
    const finalTotal = totalAmount + taxAmount + deliveryCharge;

    const order = await Order.create({
      customerId,
      restaurantId,
      items: orderItems,
      totalAmount: finalTotal,
      deliveryCharge,
      taxAmount,
      status: 'placed',
      statusHistory: [{ status: 'placed' }]
    });

    // Emit socket event to restaurant room
    const io = getIO();
    io.to(`restaurant:${restaurantId}`).emit('restaurant:new_order', order);
    io.to('operations:live').emit('ops:order_placed', order);

    return NextResponse.json({ 
      success: true, 
      orderId: order._id, 
      totalAmount: finalTotal,
      estimatedDelivery: 45 // 45 mins default
    }, { status: 201 });

  } catch (error) {
    console.error('Order placement error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const userId = req.headers.get('x-user-id');
    const role = req.headers.get('x-user-role');
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    let query = {};
    if (role === 'customer') {
      query.customerId = userId;
    } else if (role === 'restaurant_manager') {
      // Assuming restaurant manager only sees their restaurant's orders
      if (!restaurantId) {
         return NextResponse.json({ success: false, message: 'restaurantId required' }, { status: 400 });
      }
      query.restaurantId = restaurantId;
    } else if (role === 'admin' || role === 'operations_manager') {
      // Admin/Ops can filter or see all
      if (restaurantId) query.restaurantId = restaurantId;
    }

    const orders = await Order.find(query).sort({ placedAt: -1 }).limit(50);
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
