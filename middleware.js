import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // Must use jose for edge runtime

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

// Define route access policies
const RBAC_POLICIES = {
  '/api/orders': ['customer', 'restaurant_manager', 'delivery_partner', 'admin'],
  '/api/delivery': ['delivery_partner', 'operations_manager', 'admin'],
  '/api/menu': ['restaurant_manager', 'admin'],
  '/api/analytics': ['restaurant_manager', 'operations_manager', 'admin'],
  '/api/recommendations': ['customer', 'admin'],
  '/api/reviews': ['customer', 'admin'],
  '/api/search': ['customer', 'admin'], // Actually search can be public, but let's allow everyone logged in
  '/api/admin': ['admin']
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow auth routes to pass
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Only protect /api routes for now
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  let decoded;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    decoded = payload;
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Invalid token', code: 'INVALID_TOKEN' }, { status: 401 });
  }

  // Check RBAC based on path prefix
  const role = decoded.role;
  let allowed = false;

  for (const [routePrefix, allowedRoles] of Object.entries(RBAC_POLICIES)) {
    if (pathname.startsWith(routePrefix)) {
      if (allowedRoles.includes(role)) {
        allowed = true;
        break;
      } else {
        return NextResponse.json({ success: false, message: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
      }
    }
  }

  // If path wasn't in RBAC policies, it's either allowed or we require an admin. We'll default to allow for non-matched api routes if token is valid.
  
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', decoded.userId);
  requestHeaders.set('x-user-role', decoded.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/api/:path*'],
};
