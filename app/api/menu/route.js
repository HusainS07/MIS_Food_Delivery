import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import MenuItem from '@/models/MenuItem';

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { restaurantId, name, description, price, category, imageUrl, dietaryTags } = body;

    const item = await MenuItem.create({
      restaurantId,
      name,
      description,
      price,
      category,
      imageUrl,
      dietaryTags
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error('Menu item create error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
