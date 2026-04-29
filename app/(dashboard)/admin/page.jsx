"use client";
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { Users, Star, ShieldCheck, UserX, UserCheck } from 'lucide-react';

import { useOperationsStore } from '@/app/store/useStore';

export default function AdminDashboard() {
  const { orders } = useOperationsStore();

  // Dynamically generate users from unique customer names in live orders
  const uniqueCustomers = useMemo(() => {
    const names = [...new Set(orders.map(o => o.customerName))].filter(Boolean);
    return names.slice(0, 50).map((name, i) => ({
      id: `U${1000 + i}`,
      name,
      email: `${name.toLowerCase().replace(/ /g, '.')}@example.com`,
      role: 'customer',
      status: 'active'
    }));
  }, [orders]);

  // Dynamically generate reviews from delivered orders
  const generatedReviews = useMemo(() => {
    return orders.filter(o => o.status === 'delivered').map((o, i) => {
      // Deterministically generate a mock rating based on order delay or ID
      const delay = (o.timestamp % 5) + 1; // 1 to 5 stars
      return {
        id: `R${o.orderId}`,
        orderId: o.orderId,
        restaurant: o.restaurantName,
        rating: delay,
        comment: delay >= 4 ? 'Great food and fast delivery!' : 'Food was okay, but took too long.',
        status: i % 3 === 0 ? 'published' : 'pending' // Mix of statuses
      };
    });
  }, [orders]);

  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);

  // Sync state when new data arrives
  useEffect(() => {
    if (users.length === 0 && uniqueCustomers.length > 0) setUsers(uniqueCustomers);
  }, [uniqueCustomers, users.length]);

  useEffect(() => {
    if (reviews.length === 0 && generatedReviews.length > 0) setReviews(generatedReviews);
  }, [generatedReviews, reviews.length]);

  const toggleUserStatus = (id) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      return u;
    }));
  };

  const moderateReview = (id, action) => {
    setReviews(prev => prev.map(r => {
      if (r.id === id) return { ...r, status: action };
      return r;
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Admin Control Center</h1>
        <p className="text-slate-500 mt-1">Manage platform users and moderate customer reviews.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* User & Access Management */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
               <Users className="w-5 h-5 text-indigo-600" /> User & Access Management
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium text-slate-800">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600 capitalize">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'active' ? (
                        <span className="flex items-center text-xs text-green-600"><UserCheck className="w-3 h-3 mr-1" /> Active</span>
                      ) : (
                        <span className="flex items-center text-xs text-red-600"><UserX className="w-3 h-3 mr-1" /> Suspended</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <button 
                        onClick={() => toggleUserStatus(user.id)}
                        className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${user.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Moderation */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
               <Star className="w-5 h-5 text-yellow-500" /> Ratings & Review Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Moderate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map(review => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <p className="font-medium text-slate-800 text-sm">{review.restaurant}</p>
                      <p className="text-xs text-slate-500">Order #{review.orderId}</p>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex text-yellow-400 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 truncate" title={review.comment}>&quot;{review.comment}&quot;</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${
                        review.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                        review.status === 'published' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {review.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {review.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => moderateReview(review.id, 'published')} className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100" title="Publish">
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button onClick={() => moderateReview(review.id, 'rejected')} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100" title="Reject">
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
