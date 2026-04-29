import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getRedisClient } from '@/lib/redis';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const to = searchParams.get('to') || new Date().toISOString();
    const restaurantId = searchParams.get('restaurantId'); // Optional

    const cacheKey = `analytics:${from}:${to}:${restaurantId || 'all'}`;
    const redis = await getRedisClient();
    
    // Check cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return NextResponse.json({ success: true, data: JSON.parse(cachedData), cached: true });
    }

    const matchStage = {
      placedAt: { $gte: new Date(from), $lte: new Date(to) }
    };

    if (restaurantId) {
      matchStage.restaurantId = restaurantId; // would need mongoose.Types.ObjectId in real scenario
    }

    // Aggregations
    const pipeline = [
      { $match: matchStage },
      { $facet: {
          totalStats: [
            { $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: "$totalAmount" },
                // Calculate average delivery time where deliveredAt exists
                avgDeliveryTime: {
                  $avg: {
                    $cond: [
                      { $and: [{ $ne: ["$deliveredAt", null] }, { $ne: ["$placedAt", null] }] },
                      { $divide: [{ $subtract: ["$deliveredAt", "$placedAt"] }, 60000] }, // mins
                      null
                    ]
                  }
                }
              }
            }
          ],
          revenueByRestaurant: [
            { $group: {
                _id: "$restaurantId",
                revenue: { $sum: "$totalAmount" }
              }
            },
            { $limit: 10 }
          ],
          ordersByHour: [
            { $group: {
                _id: { $hour: "$placedAt" },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id": 1 } }
          ]
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    
    const data = {
      totalStats: result[0].totalStats[0] || { totalOrders: 0, totalRevenue: 0, avgDeliveryTime: 0 },
      revenueByRestaurant: result[0].revenueByRestaurant,
      ordersByHour: result[0].ordersByHour
    };

    // Store in cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(data), { EX: 300 });

    return NextResponse.json({ success: true, data, cached: false });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
