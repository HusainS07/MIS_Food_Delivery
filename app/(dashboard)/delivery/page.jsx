"use client";
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { useSocket } from '@/app/components/realtime/SocketProvider';
import LiveMap from '@/app/components/maps/LiveMap';

import { useOperationsStore } from '@/app/store/useStore';

export default function DeliveryDashboard() {
  const socket = useSocket();
  const { orders } = useOperationsStore();
  
  // Find the first order that is either assigned, preparing, or en_route
  const activeOrder = useMemo(() => {
    return orders.find(o => ['placed', 'preparing', 'assigned', 'en_route'].includes(o.status));
  }, [orders]);

  const [activeDelivery, setActiveDelivery] = useState(null);

  useEffect(() => {
    if (activeOrder && !activeDelivery) {
      // Create a mock delivery assignment based on the real order
      setActiveDelivery({
        orderId: activeOrder.orderId,
        restaurant: { name: activeOrder.restaurantName, address: 'Restaurant Location', lat: 19.1350, lng: 72.8450 },
        customer: { address: 'Customer Address', lat: 19.1300, lng: 72.8490 },
        status: activeOrder.status,
      });
    } else if (activeOrder && activeDelivery) {
       setActiveDelivery(prev => ({...prev, status: activeOrder.status}));
    } else if (!activeOrder) {
       setActiveDelivery(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder]);
  
  const [currentLocation, setCurrentLocation] = useState({ lat: 19.1389, lng: 72.8406 }); // Jogeshwari
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    let interval;
    if (isSimulating && socket && activeDelivery) {
      interval = setInterval(() => {
        setCurrentLocation(prev => {
          const target = activeDelivery.status === 'placed' || activeDelivery.status === 'preparing' || activeDelivery.status === 'assigned' 
            ? activeDelivery.restaurant : activeDelivery.customer;
          
          // Vector interpolation towards target
          const distLat = target.lat - prev.lat;
          const distLng = target.lng - prev.lng;
          
          // Stop moving if very close
          if (Math.abs(distLat) < 0.0001 && Math.abs(distLng) < 0.0001) return prev;

          const newLoc = {
            lat: prev.lat + (distLat * 0.1),
            lng: prev.lng + (distLng * 0.1)
          };
          
          socket.emit('partner:location_update', {
            orderId: activeDelivery.orderId,
            partnerId: 'p1',
            lat: newLoc.lat,
            lng: newLoc.lng
          });
          
          return newLoc;
        });
      }, 1000); // Faster visual update
    }
    
    return () => clearInterval(interval);
  }, [isSimulating, socket, activeDelivery]);

  // Handle order status updates locally
  const updateDeliveryStatus = (newStatus) => {
    if (!activeDelivery) return;
    setActiveDelivery(prev => ({...prev, status: newStatus}));
    if (socket) {
      socket.emit('update_order_status', { orderId: activeDelivery.orderId, status: newStatus });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-0 md:flex-row md:space-x-6">
      {/* Left panel: Info */}
      <div className="w-full md:w-1/3 flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Portal</h1>
          <p className="text-muted-foreground mt-1">Current active assignment</p>
        </div>
        
        {!activeDelivery ? (
          <Card className="flex-1 border-primary/20 bg-primary/5 flex items-center justify-center p-8">
            <div className="text-center">
               <p className="text-slate-500 font-medium">Waiting for assignment...</p>
               <p className="text-xs text-slate-400 mt-2">No active orders in the system.</p>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Order #{activeDelivery.orderId}</CardTitle>
                <Badge variant={activeDelivery.status === 'en_route' ? 'default' : 'secondary'}>
                  {activeDelivery.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative pl-6 border-l-2 border-muted space-y-6">
                <div className="relative">
                  <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center border-2 border-background"></div>
                  <h4 className="text-sm font-semibold">Pickup: {activeDelivery.restaurant.name}</h4>
                  <p className="text-xs text-muted-foreground">{activeDelivery.restaurant.address}</p>
                </div>
                <div className="relative">
                   <div className="absolute -left-[29px] top-1 w-4 h-4 rounded-full bg-muted flex items-center justify-center border-2 border-background"></div>
                   <h4 className="text-sm font-semibold">Dropoff: Customer</h4>
                   <p className="text-xs text-muted-foreground">{activeDelivery.customer.address}</p>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button 
                  className="w-full" 
                  variant={isSimulating ? 'outline' : 'default'}
                  onClick={() => setIsSimulating(!isSimulating)}
                >
                  {isSimulating ? 'Stop GPS Movement' : 'Start GPS Movement'}
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => updateDeliveryStatus('picked_up')}
                  disabled={activeDelivery.status === 'en_route' || activeDelivery.status === 'delivered'}
                >
                  Mark as Picked Up
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => updateDeliveryStatus('en_route')}
                  disabled={activeDelivery.status !== 'picked_up'}
                >
                  Mark as En Route
                </Button>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                  onClick={() => { updateDeliveryStatus('delivered'); setIsSimulating(false); }}
                  disabled={activeDelivery.status !== 'en_route'}
                >
                  Mark as Delivered
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right panel: Map */}
      <div className="w-full md:w-2/3 h-[50vh] md:h-full bg-muted rounded-xl">
        <LiveMap 
          center={[19.1350, 72.8450]}
          partnerLocation={currentLocation}
          routeCoords={activeDelivery ? [
            [currentLocation.lat, currentLocation.lng],
            [activeDelivery.restaurant.lat, activeDelivery.restaurant.lng],
            [activeDelivery.customer.lat, activeDelivery.customer.lng]
          ] : []}
        />
      </div>
    </div>
  );
}
