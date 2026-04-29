import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Restaurant from '@/models/Restaurant';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const cuisine = searchParams.get('cuisine');
    const search = searchParams.get('q');

    let query = { isActive: true };

    if (cuisine) {
      query.cuisineType = { $in: [cuisine] };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const restaurants = await Restaurant.find(query);

    return NextResponse.json({ success: true, restaurants });
  } catch (error) {
    console.error('Fetch restaurants error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
