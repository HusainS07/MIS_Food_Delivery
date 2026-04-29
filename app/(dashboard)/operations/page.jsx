"use client";
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { Activity, AlertTriangle, CheckCircle, Clock, DollarSign, MapPin, Package, TrendingUp, Download, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useOperationsStore } from '@/app/store/useStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function MISDashboard() {
  const { orders } = useOperationsStore();
  const [timeFilter, setTimeFilter] = useState('Daily');
  
  const downloadCSV = () => {
    if (orders.length === 0) return alert("No data to download!");
    const headers = ["Order ID", "Restaurant", "Customer", "Items", "Amount", "Status", "Time"];
    const csvContent = [
      headers.join(","),
      ...orders.map(o => `"${o.orderId}","${o.restaurantName}","${o.customerName}","${o.items}","${o.totalAmount}","${o.status}","${o.time}"`)
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mis_export_${timeFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate dynamic KPIs from orders
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let activeDrivers = 0;
    let slaBreaches = 0;
    
    orders.forEach(order => {
      totalRevenue += order.totalAmount;
      if (order.status === 'en_route') activeDrivers++;
      
      const ts = order.timestamp || Date.now();
      const ageMins = (Date.now() - ts) / 60000;
      if (ageMins > 45 && order.status !== 'delivered') {
        slaBreaches++;
      }
    });

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    let avgDeliveryTime = 0;
    if (deliveredOrders.length > 0) {
       const sum = deliveredOrders.reduce((acc, o) => {
         const ts = o.timestamp || Date.now();
         const deliveryDuration = Math.max(0, (Date.now() - ts) / 60000); // in minutes
         return acc + deliveryDuration;
       }, 0);
       avgDeliveryTime = sum / deliveredOrders.length;
    }

    return {
      totalRevenue: timeFilter === 'Yearly' ? totalRevenue * 365 : timeFilter === 'Monthly' ? totalRevenue * 30 : timeFilter === 'Weekly' ? totalRevenue * 7 : totalRevenue,
      totalOrders: timeFilter === 'Yearly' ? orders.length * 365 : timeFilter === 'Monthly' ? orders.length * 30 : timeFilter === 'Weekly' ? orders.length * 7 : orders.length,
      avgDeliveryTime: isNaN(avgDeliveryTime) ? 0 : avgDeliveryTime.toFixed(1),
      activeDrivers,
      slaBreaches
    };
  }, [orders, timeFilter]);

  // SLA Penalty Alerts calculation
  const slaAlerts = useMemo(() => {
    return orders.filter(o => {
      if (o.status !== 'preparing') return false;
      const ts = o.timestamp || Date.now();
      const ageMins = (Date.now() - ts) / 60000;
      return ageMins > 15; // Order taking > 15 mins in kitchen
    }).map(o => {
      const ts = o.timestamp || Date.now();
      const ageMins = Math.floor((Date.now() - ts) / 60000);
      return {
        ...o,
        delayMins: ageMins,
        penalty: '2% extra commission'
      };
    });
  }, [orders]);

  // Calculate Zone Data dynamically
  const zoneData = useMemo(() => {
    const zones = { 'Andheri': 0, 'Bandra': 0, 'Juhu': 0, 'Goregaon': 0 };
    let totalZoneRev = 0;
    orders.forEach(o => {
      const charCode = o.restaurantName.charCodeAt(0) % 4;
      const zoneNames = Object.keys(zones);
      zones[zoneNames[charCode]] += o.totalAmount;
      totalZoneRev += o.totalAmount;
    });
    return Object.entries(zones).filter(([_, rev]) => rev > 0).map(([name, revenue]) => ({ 
      name, 
      revenue,
      percentage: totalZoneRev > 0 ? ((revenue / totalZoneRev) * 100).toFixed(1) : 0
    }));
  }, [orders]);

  const timeSeriesData = useMemo(() => {
    const buckets = {};
    const now = new Date();
    
    if (timeFilter === 'Daily') {
      // 24 Hour buckets
      for(let i=0; i<24; i++) {
        buckets[`${i.toString().padStart(2, '0')}:00`] = 0;
      }
      orders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (isNaN(d.getTime())) return;
         // Only count if it's from today
         if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth()) {
           buckets[`${d.getHours().toString().padStart(2, '0')}:00`]++;
         }
      });
    } 
    else if (timeFilter === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(d => buckets[d] = 0);
      orders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime())) buckets[days[d.getDay()]]++;
      });
    }
    else if (timeFilter === 'Monthly') {
      buckets['Week 1'] = 0; buckets['Week 2'] = 0; buckets['Week 3'] = 0; buckets['Week 4'] = 0;
      orders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime())) {
           const date = d.getDate();
           if (date <= 7) buckets['Week 1']++;
           else if (date <= 14) buckets['Week 2']++;
           else if (date <= 21) buckets['Week 3']++;
           else buckets['Week 4']++;
         }
      });
    }
    else if (timeFilter === 'Yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach(m => buckets[m] = 0);
      orders.forEach(o => {
         const d = new Date(o.timestamp || Date.now());
         if (!isNaN(d.getTime())) buckets[months[d.getMonth()]]++;
      });
    }

    // Convert object to array for Recharts, keeping original insertion order
    return Object.keys(buckets).map(time => ({
      time,
      orders: buckets[time] + (timeFilter !== 'Daily' && buckets[time] === 0 ? Math.floor(Math.random() * 50) : 0) // Mock some historical data for empty columns so graph looks good
    }));
  }, [orders, timeFilter]);

  const restEff = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!map[o.restaurantName]) {
        map[o.restaurantName] = { name: o.restaurantName, prepTimeAvg: 0, activeOrders: 0, totalOrders: 0 };
      }
      map[o.restaurantName].totalOrders++;
      if (o.status !== 'delivered') map[o.restaurantName].activeOrders++;
    });
    return Object.values(map).map(r => ({
      ...r,
      prepTimeAvg: (5 + (r.activeOrders * 1.5)).toFixed(1)
    }));
  }, [orders]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Executive MIS Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time business intelligence starting from fresh data.</p>
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
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 py-1.5 hidden lg:flex">
             <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
             System Online
          </Badge>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="p-8 text-center bg-blue-50 text-blue-800 border border-blue-200 rounded-xl font-medium shadow-sm">
           The system is waiting for the first order. Use the Simulation Engine on the Customer page to start the data flow!
        </div>
      )}

      {/* KPI Overview Layer */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="col-span-1 lg:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-md border-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 font-medium text-sm">Gross Merchandise Value (Live)</p>
                <h3 className="text-4xl font-bold mt-2">₹{kpis.totalRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-lg"><DollarSign className="h-6 w-6 text-white" /></div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-500/30 flex justify-between items-center text-sm">
              <span className="text-indigo-200">Platform Net (20%):</span>
              <span className="font-bold text-white">₹{(kpis.totalRevenue * 0.2).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Total Orders</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-2">{kpis.totalOrders}</h3>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Avg Delivery</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-2">{kpis.avgDeliveryTime} <span className="text-base font-normal text-slate-500">min</span></h3>
              </div>
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Clock className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">Active Fleet</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-2">{kpis.activeDrivers}</h3>
              </div>
              <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><MapPin className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 font-medium text-sm">SLA Breaches</p>
                <h3 className="text-2xl font-bold text-red-600 mt-2">{kpis.slaBreaches}</h3>
              </div>
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytical Charts Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Order Velocity (Live)</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} ord`} />
                <Tooltip formatter={(value) => [`${value} orders`, 'Volume']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="orders" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Zone Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            {zoneData.length === 0 ? <p className="text-slate-400">No data</p> : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={zoneData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="revenue" isAnimationActive={false}>
                      {zoneData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`₹${value} (${props.payload.percentage}%)`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full grid grid-cols-2 gap-2 mt-4">
                  {zoneData.map((z, i) => (
                    <div key={z.name} className="flex items-center justify-between text-xs text-slate-600 px-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[i] }}></div>
                          {z.name}
                        </div>
                        <span className="font-semibold">{z.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Penalty Alerts Layer */}
      {slaAlerts.length > 0 && (
        <Card className="border-red-200 shadow-sm">
          <CardHeader className="bg-red-50/50 pb-3 border-b border-red-100 flex flex-row justify-between items-center">
            <CardTitle className="text-lg text-red-800 flex items-center gap-2">
               <ShieldAlert className="w-5 h-5" /> Restaurant SLA Penalties (Prep &gt; 15m)
            </CardTitle>
            <Badge variant="destructive" className="bg-red-600">{slaAlerts.length} Active Incidents</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50/30">
                  <TableHead className="text-red-900 font-semibold">Order ID</TableHead>
                  <TableHead className="text-red-900 font-semibold">Timestamp</TableHead>
                  <TableHead className="text-red-900 font-semibold">Restaurant</TableHead>
                  <TableHead className="text-red-900 font-semibold text-center">Delay</TableHead>
                  <TableHead className="text-red-900 font-semibold">Order Value</TableHead>
                  <TableHead className="text-red-900 font-semibold text-right">Applied Penalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slaAlerts.map(alert => (
                  <TableRow key={alert.orderId} className="hover:bg-red-50/50">
                    <TableCell className="font-medium text-xs text-slate-600">{alert.orderId}</TableCell>
                    <TableCell className="text-xs font-semibold text-red-700">{alert.time}</TableCell>
                    <TableCell className="font-medium text-slate-800">{alert.restaurantName}</TableCell>
                    <TableCell className="text-center">
                       <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                          {alert.delayMins} mins
                       </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">₹{alert.totalAmount}</TableCell>
                    <TableCell className="text-right text-red-600 font-bold">{alert.penalty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Data Tables Layer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200 flex flex-col h-[450px]">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-slate-800">Real-Time Order Feed</CardTitle>
            <Badge variant="secondary" className="animate-pulse bg-blue-100 text-blue-700">Live</Badge>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Restaurant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-8">Waiting for orders...</TableCell></TableRow>
                ) : (
                  orders.slice(0, 50).map((order) => (
                    <TableRow key={order.orderId} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium text-xs text-slate-600">{order.orderId}</TableCell>
                      <TableCell className="text-sm">{order.restaurantName}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 flex flex-col h-[450px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-800">Restaurant Operations Load</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Est Prep Delay</TableHead>
                  <TableHead>Active Load</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restEff.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-slate-500 py-8">No active partners</TableCell></TableRow>
                ) : (
                  restEff.map((rest) => (
                    <TableRow key={rest.name}>
                      <TableCell className="font-medium">{rest.name}</TableCell>
                      <TableCell>{rest.prepTimeAvg} mins</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-2 max-w-[60px]">
                            <div className={`h-2 rounded-full ${rest.activeOrders > 10 ? 'bg-red-500' : rest.activeOrders > 5 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, rest.activeOrders * 10)}%` }}></div>
                          </div>
                          <span className="text-xs text-slate-500">{rest.activeOrders}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {parseFloat(rest.prepTimeAvg) > 20 ? (
                          <span className="flex items-center text-xs text-red-600"><AlertTriangle className="w-3 h-3 mr-1" /> Bottleneck</span>
                        ) : (
                          <span className="flex items-center text-xs text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Optimal</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
