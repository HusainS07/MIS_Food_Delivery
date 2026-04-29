import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MenuItem from '@/models/MenuItem';
import { getIO } from '@/lib/socket';

export async function PATCH(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;
    const body = await req.json();
    const { isAvailable, price, name, description } = body;

    const item = await MenuItem.findById(id);
    if (!item) return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });

    if (isAvailable !== undefined) item.isAvailable = isAvailable;
    if (price !== undefined) item.price = price;
    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;

    await item.save();

    // Broadcast menu change if availability changes
    if (isAvailable !== undefined) {
      const io = getIO();
      // Emitting to all customers (or we can emit to restaurant specific room and customers inside it)
      io.emit('restaurant:menu_change', { itemId: item._id, isAvailable });
    }

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Menu update error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
