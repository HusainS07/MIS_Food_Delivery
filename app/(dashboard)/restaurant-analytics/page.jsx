"use client";
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { DollarSign, Clock, Package, Activity, Target, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOperationsStore } from '@/app/store/useStore';

export default function RestaurantAnalytics() {
  const { orders } = useOperationsStore();
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [timeFilter, setTimeFilter] = useState('Daily');

  const downloadCSV = () => {
    const restaurantOrders = orders.filter(o => o.restaurantName === selectedRestaurant);
    if (restaurantOrders.length === 0) return alert("No data to download!");
    const headers = ["Order ID", "Items", "Amount", "Status", "Time", "Commission"];
    const csvContent = [
      headers.join(","),
      ...restaurantOrders.map(o => `"${o.orderId}","${o.items}","${o.totalAmount}","${o.status}","${o.time}","${o.totalAmount * 0.2}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedRestaurant?.replace(' ', '_')}_export_${timeFilter.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract unique restaurants from orders or use defaults
  const restaurants = useMemo(() => {
    return [...new Set(orders.map(o => o.restaurantName))];
  }, [orders]);

  useEffect(() => {
    if (restaurants.length > 0 && !selectedRestaurant) {
      setSelectedRestaurant(restaurants[0]);
    }
  }, [restaurants, selectedRestaurant]);

  // Calculate analytics for selected restaurant
  const analytics = useMemo(() => {
    const restaurantOrders = orders.filter(o => o.restaurantName === selectedRestaurant);
    
    let totalRevenue = 0;
    let activeWorkload = 0;
    let lateOrdersCount = 0;

    restaurantOrders.forEach(o => {
      totalRevenue += o.totalAmount;
      if (o.status !== 'delivered') activeWorkload++;
      
      const ageMins = (Date.now() - o.timestamp) / 60000;
      if (o.status === 'preparing' && ageMins > 15) {
        lateOrdersCount++; // Late if prep takes more than 15 mins
      }
    });
    
    const multiplier = timeFilter === 'Yearly' ? 365 : timeFilter === 'Monthly' ? 30 : timeFilter === 'Weekly' ? 7 : 1;
    totalRevenue = totalRevenue * multiplier;

    const commissionRate = 0.20; // 20% platform commission
    const commissionEarned = totalRevenue * commissionRate;
    const netPayout = totalRevenue - commissionEarned;

    // Time series for this restaurant based on filter
    const buckets = {};
    const now = new Date();
    
    if (timeFilter === 'Daily') {
      for(let i=0; i<24; i++) {
        buckets[`${i.toString().padStart(2, '0')}:00`] = 0;
      }
      restaurantOrders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime()) && d.getDate() === now.getDate()) {
           buckets[`${d.getHours().toString().padStart(2, '0')}:00`] += o.totalAmount;
         }
      });
    } 
    else if (timeFilter === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(d => buckets[d] = 0);
      restaurantOrders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime())) buckets[days[d.getDay()]] += o.totalAmount;
      });
    }
    else if (timeFilter === 'Monthly') {
      buckets['Week 1'] = 0; buckets['Week 2'] = 0; buckets['Week 3'] = 0; buckets['Week 4'] = 0;
      restaurantOrders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime())) {
           const date = d.getDate();
           if (date <= 7) buckets['Week 1'] += o.totalAmount;
           else if (date <= 14) buckets['Week 2'] += o.totalAmount;
           else if (date <= 21) buckets['Week 3'] += o.totalAmount;
           else buckets['Week 4'] += o.totalAmount;
         }
      });
    }
    else if (timeFilter === 'Yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => buckets[m] = 0);
      restaurantOrders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime())) buckets[months[d.getMonth()]] += o.totalAmount;
      });
    }
    
    let timeBuckets = Object.keys(buckets).map(time => ({
      time,
      revenue: buckets[time] + (timeFilter !== 'Daily' && buckets[time] === 0 ? Math.floor(Math.random() * 5000) : 0) // Mock historical data
    }));

    return {
      totalOrders: restaurantOrders.length * multiplier,
      totalRevenue,
      commissionEarned,
      netPayout,
      activeWorkload,
      lateOrdersCount,
      restaurantOrders,
      timeBuckets
    };
  }, [orders, selectedRestaurant, timeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Restaurant Analytics</h1>
          <p className="text-slate-500 mt-1">Deep dive into partner performance and financials.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-lg flex p-1 shadow-sm">
             {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(tf => (
               <button 
                 key={tf}
                 onClick={() => setTimeFilter(tf)}
                 className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${timeFilter === tf ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}
               >
                 {tf}
               </button>
             ))}
          </div>
          <button onClick={downloadCSV} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-slate-700">Select Partner:</span>
          <select 
            className="bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
          >
            {restaurants.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        
        {selectedRestaurant && (
          <div className="flex items-center gap-6 px-4 border-l border-slate-200">
            <div>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Average Rating</p>
               <div className="flex items-center gap-1 mt-1">
                 <span className="text-xl font-bold text-slate-800">
                   {(4.0 + (selectedRestaurant.charCodeAt(0) % 10) / 10).toFixed(1)}
                 </span>
                 <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
               </div>
            </div>
            <div>
               <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Reviews</p>
               <p className="text-xl font-bold text-slate-800 mt-1">
                 {(selectedRestaurant.charCodeAt(1) || 5) * 12 + analytics.totalOrders}
               </p>
            </div>
          </div>
        )}
      </div>

      {analytics.totalOrders === 0 ? (
        <div className="p-8 text-center bg-blue-50 text-blue-800 border border-blue-200 rounded-xl font-medium shadow-sm">
           No data available for {selectedRestaurant}. Use the Simulation Engine to generate orders!
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 font-medium text-sm">Total Revenue Generated</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-2">₹{analytics.totalRevenue.toLocaleString()}</h3>
                  </div>
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 font-medium text-sm">Platform Commission (20%)</p>
                    <h3 className="text-2xl font-bold text-indigo-600 mt-2">₹{analytics.commissionEarned.toLocaleString()}</h3>
                  </div>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Target className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className={analytics.activeWorkload > 10 ? 'border-red-300 bg-red-50' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 font-medium text-sm">Active Workload (Orders)</p>
                    <h3 className={`text-2xl font-bold mt-2 ${analytics.activeWorkload > 10 ? 'text-red-700' : 'text-slate-800'}`}>
                      {analytics.activeWorkload}
                    </h3>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className={analytics.lateOrdersCount > 0 ? 'border-orange-300 bg-orange-50' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 font-medium text-sm">Delayed Preparation</p>
                    <h3 className={`text-2xl font-bold mt-2 ${analytics.lateOrdersCount > 0 ? 'text-orange-700' : 'text-slate-800'}`}>
                      {analytics.lateOrdersCount}
                    </h3>
                  </div>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock className="h-5 w-5" /></div>
                </div>
                <div className="mt-4 flex items-center text-xs text-slate-500">
                  Orders taking &gt; 15 mins
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">Revenue Generation Timeline</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.timeBuckets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(val) => `₹${val}`} contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 flex flex-col h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-800">Recent Partner Orders</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.restaurantOrders.slice(0, 15).map((order) => (
                      <TableRow key={order.orderId} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-xs text-slate-600">{order.orderId}</TableCell>
                        <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">{order.items}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${
                            order.status === 'placed' ? 'bg-blue-50 text-blue-700' :
                            order.status === 'preparing' ? 'bg-yellow-50 text-yellow-700' :
                            order.status === 'en_route' ? 'bg-orange-50 text-orange-700' :
                            'bg-green-50 text-green-700'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">₹{order.totalAmount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
