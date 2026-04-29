"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useOperationsStore } from '@/app/store/useStore';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin);
    
    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      
      // Auto join rooms based on role
      if (user?.role === 'operations_manager' || user?.role === 'admin') {
        socketInstance.emit('join_ops_room');
      }
      
      if (user?.role === 'restaurant_manager' && user?.restaurantId) {
        socketInstance.emit('join_restaurant_room', user.restaurantId);
      }
    });

    // Global listeners to populate in-memory MIS store
    socketInstance.on('hydrate_orders', (allOrders) => {
      useOperationsStore.setState({ orders: allOrders });
    });

    socketInstance.on('ops:order_placed', (order) => {
      useOperationsStore.getState().addOrder(order);
    });
    
    socketInstance.on('ops:order_status_update', (data) => {
      useOperationsStore.getState().updateOrderStatus(data.orderId, data.status);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
