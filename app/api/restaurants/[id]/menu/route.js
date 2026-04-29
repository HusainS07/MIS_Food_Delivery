import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MenuItem from '@/models/MenuItem';

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = params;

    const menu = await MenuItem.find({ restaurantId: id });

    return NextResponse.json({ success: true, menu });
  } catch (error) {
    console.error('Fetch menu error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
