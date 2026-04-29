"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Search, Star, Clock, ShoppingCart, ArrowLeft, Play, FastForward, Activity } from 'lucide-react';
import { useSocket } from '@/app/components/realtime/SocketProvider';

export default function CustomerDashboard() {
  const socket = useSocket();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderStatus, setOrderStatus] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    setRestaurants([
      { _id: '1', name: 'Luigi Pizza', cuisineType: ['Italian'], rating: { avg: 4.8 }, menu: [{ _id: 'm1', name: 'Margherita Pizza', price: 299, desc: 'Classic cheese' }] },
      { _id: '2', name: 'Spice Route', cuisineType: ['Indian', 'Spicy'], rating: { avg: 4.5 }, menu: [{ _id: 'm4', name: 'Butter Chicken', price: 350, desc: 'Creamy gravy' }] },
      { _id: '3', name: 'Burger Hub', cuisineType: ['American'], rating: { avg: 4.2 }, menu: [{ _id: 'm6', name: 'Cheese Burger', price: 150, desc: 'Juicy patty' }] },
      { _id: '4', name: 'Wok This Way', cuisineType: ['Asian'], rating: { avg: 4.6 }, menu: [{ _id: 'm8', name: 'Hakka Noodles', price: 210, desc: 'Spicy wok tossed' }] },
    ]);
  }, []);

  const placeOrder = () => {
    if (!socket) return alert("Connecting to server...");
    
    const totalAmount = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) + 40;
    const itemsText = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
    
    const orderData = {
      _id: 'ord_' + Math.floor(Math.random() * 100000),
      orderId: 'ord_' + Math.floor(Math.random() * 100000),
      restaurantId: selectedRestaurant._id,
      restaurantName: selectedRestaurant.name,
      customerName: 'Guest User',
      items: itemsText,
      totalAmount,
      status: 'placed',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit('place_new_order', orderData);
    setOrderStatus({ orderId: orderData.orderId, status: 'placed' });
    setCart([]);
    setSelectedRestaurant(null);
  };

  const simulateLoadTest = (count) => {
    if (!socket) return;
    setSimulating(true);
    let i = 0;
    
    const interval = setInterval(() => {
      // Every 5th order in the simulation is intentionally delayed to trigger the SLA Penalty alert
      const isDelayed = i % 5 === 0;
      const rest = restaurants[Math.floor(Math.random() * restaurants.length)];
      const item = rest.menu[0];
      const qty = Math.floor(Math.random() * 3) + 1;
      
      const orderData = {
        _id: 'sim_' + Math.floor(Math.random() * 1000000),
        orderId: 'sim_' + Math.floor(Math.random() * 1000000),
        restaurantId: rest._id,
        restaurantName: rest.name,
        customerName: `Sim User ${Math.floor(Math.random() * 1000)}`,
        items: `${qty}x ${item.name}`,
        totalAmount: (item.price * qty) + 40,
        timestamp: isDelayed ? Date.now() - (20 * 60000) : Date.now(),
        time: new Date(isDelayed ? Date.now() - (20 * 60000) : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: isDelayed ? 'preparing' : 'placed'
      };
      
      socket.emit('place_new_order', orderData);
      
      if (!isDelayed) {
        setTimeout(() => socket.emit('update_order_status', { orderId: orderData.orderId, status: 'preparing' }), 3000 + Math.random() * 5000);
        setTimeout(() => socket.emit('update_order_status', { orderId: orderData.orderId, status: 'en_route' }), 10000 + Math.random() * 8000);
        setTimeout(() => socket.emit('update_order_status', { orderId: orderData.orderId, status: 'delivered' }), 20000 + Math.random() * 10000);
      }

      i++;
      if (i >= count) {
        clearInterval(interval);
        setSimulating(false);
      }
    }, 800); // 1 order every 0.8 seconds
  };

  if (orderStatus) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <Card className="text-center p-8 border-slate-200 shadow-md">
          <h2 className="text-2xl font-bold mb-2">Order Submitted!</h2>
          <p className="text-slate-500 mb-6">Check the Operations Dashboard to see it arrive in real time.</p>
          <Button className="mt-4" onClick={() => setOrderStatus(null)}>Go Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Simulation Engine Panel - Placed at the top since user wants MIS focus */}
      <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex items-center gap-3 text-white">
           <Activity className="h-6 w-6" />
           <div>
             <h2 className="text-xl font-bold">MIS Simulation Engine</h2>
             <p className="text-indigo-200 text-sm">Blast data into the system to watch the Operations Dashboard react</p>
           </div>
        </div>
        <CardContent className="p-6">
           <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                 <h3 className="font-semibold text-slate-800">Generate Load Test</h3>
                 <p className="text-sm text-slate-500 max-w-md">Creates randomized orders across different restaurants and simulates their entire lifecycle (Placed → Preparing → En Route → Delivered) automatically.</p>
              </div>
              <div className="flex gap-3">
                 <Button disabled={simulating} onClick={() => simulateLoadTest(10)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Play className="mr-2 h-4 w-4" /> Run 10 Orders
                 </Button>
                 <Button disabled={simulating} onClick={() => simulateLoadTest(50)} variant="secondary" className="border-indigo-200 text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
                    <FastForward className="mr-2 h-4 w-4" /> Blast 50 Orders
                 </Button>
              </div>
           </div>
           {simulating && (
             <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-md border border-blue-200 flex items-center justify-center font-medium animate-pulse">
               Simulation in progress. Processing orders automatically.
             </div>
           )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {restaurants.map(restaurant => (
          <Card key={restaurant._id} className="overflow-hidden bg-white border-slate-200">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg text-slate-800">{restaurant.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
               <Button onClick={() => { setSelectedRestaurant(restaurant); setCart([{...restaurant.menu[0], quantity: 1}]); }} className="w-full mt-4" size="sm">Quick Order Test</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRestaurant && cart.length > 0 && (
         <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-between items-center z-50 md:left-64">
            <div>
               <h3 className="font-bold text-slate-800">Ready to place test order?</h3>
               <p className="text-sm text-slate-500">From {selectedRestaurant.name}</p>
            </div>
            <div className="flex gap-4 items-center">
               <Button variant="outline" onClick={() => setSelectedRestaurant(null)}>Cancel</Button>
               <Button onClick={placeOrder} className="bg-green-600 hover:bg-green-700">Submit to Operations</Button>
            </div>
         </div>
      )}
    </div>
  );
}
