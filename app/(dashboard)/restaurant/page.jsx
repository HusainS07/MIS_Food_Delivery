"use client";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { useSocket } from '@/app/components/realtime/SocketProvider';

export default function RestaurantDashboard() {
  const socket = useSocket();
  const [orders, setOrders] = useState({
    placed: [],
    preparing: [],
    out_for_delivery: []
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('restaurant:new_order', (order) => {
      setOrders(prev => ({
        ...prev,
        placed: [...prev.placed, order]
      }));
    });
    
    // When order is assigned to delivery partner, it moves to out_for_delivery automatically
    socket.on('order:status_update', (data) => {
      if (data.status === 'en_route') {
        // Move to out for delivery
        setOrders(prev => {
          const prepOrder = prev.preparing.find(o => o.orderId === data.orderId);
          if (prepOrder) {
            return {
              ...prev,
              preparing: prev.preparing.filter(o => o.orderId !== data.orderId),
              out_for_delivery: [...prev.out_for_delivery, { ...prepOrder, status: 'en_route' }]
            };
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off('restaurant:new_order');
      socket.off('order:status_update');
    };
  }, [socket]);

  const acceptOrder = (order) => {
    setOrders(prev => ({
      ...prev,
      placed: prev.placed.filter(o => o.orderId !== order.orderId),
      preparing: [...prev.preparing, { ...order, status: 'preparing' }]
    }));
    
    if (socket) {
      socket.emit('update_order_status', { orderId: order.orderId, status: 'preparing' });
    }
  };

  const markReady = (order) => {
    setOrders(prev => ({
      ...prev,
      preparing: prev.preparing.filter(o => o.orderId !== order.orderId),
      out_for_delivery: [...prev.out_for_delivery, { ...order, status: 'ready_for_pickup' }]
    }));
    
    if (socket) {
      socket.emit('update_order_status', { orderId: order.orderId, status: 'ready_for_pickup' });
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Kitchen Operations</h1>
        <p className="text-slate-500 mt-1">Manage incoming orders in real-time.</p>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden pb-4">
        
        {/* Column: New Orders */}
        <div className="flex flex-col h-full rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              New Orders
            </h3>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">{orders.placed.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {orders.placed.length === 0 && <p className="text-center text-sm text-slate-400 mt-8">Waiting for orders...</p>}
            {orders.placed.map(order => (
              <Card key={order.orderId} className="border-l-4 border-l-blue-500 bg-white">
                <CardHeader className="p-3 pb-0">
                  <div className="flex justify-between">
                    <CardTitle className="text-sm">Order #{order.orderId}</CardTitle>
                    <span className="text-xs text-slate-500">{order.time}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <p className="font-medium text-sm text-slate-800">{order.customerName}</p>
                  <p className="text-xs text-slate-500 mt-1">{order.items}</p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-sm text-slate-800">₹{order.totalAmount}</span>
                    <button onClick={() => acceptOrder(order)} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
                      Accept Order
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Column: Preparing */}
        <div className="flex flex-col h-full rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Preparing
            </h3>
            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{orders.preparing.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {orders.preparing.length === 0 && <p className="text-center text-sm text-slate-400 mt-8">No orders preparing</p>}
            {orders.preparing.map(order => (
               <Card key={order.orderId} className="border-l-4 border-l-yellow-500 bg-white">
                <CardContent className="p-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">#{order.orderId}</span>
                    <span className="text-xs text-slate-500">{order.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{order.items}</p>
                  <button onClick={() => markReady(order)} className="w-full text-xs border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-2 rounded-md transition-colors">
                    Mark Ready for Pickup
                  </button>
                </CardContent>
               </Card>
            ))}
          </div>
        </div>

        {/* Column: Ready / Out for Delivery */}
        <div className="flex flex-col h-full rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Ready / Delivering
            </h3>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">{orders.out_for_delivery.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {orders.out_for_delivery.length === 0 && <p className="text-center text-sm text-slate-400 mt-8">Empty</p>}
            {orders.out_for_delivery.map(order => (
               <Card key={order.orderId} className="border-l-4 border-l-green-500 bg-white opacity-80">
                <CardContent className="p-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800">#{order.orderId}</span>
                    <span className="text-xs text-green-600 font-medium">{order.status === 'en_route' ? 'Out for Delivery' : 'Ready'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{order.items}</p>
                </CardContent>
               </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
