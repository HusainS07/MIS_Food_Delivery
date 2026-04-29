import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null })
}));

export const useCartStore = create((set) => ({
  items: [], // { menuItemId, name, price, quantity, restaurantId }
  restaurantId: null,
  addItem: (item) => set((state) => {
    // Cannot mix items from different restaurants
    if (state.restaurantId && state.restaurantId !== item.restaurantId) {
      alert("Clear cart first to order from a different restaurant.");
      return state;
    }
    const existing = state.items.find(i => i.menuItemId === item.menuItemId);
    if (existing) {
      return {
        ...state,
        items: state.items.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i)
      };
    }
    return {
      restaurantId: item.restaurantId,
      items: [...state.items, { ...item, quantity: 1 }]
    };
  }),
  removeItem: (menuItemId) => set((state) => {
    const existing = state.items.find(i => i.menuItemId === menuItemId);
    if (existing.quantity === 1) {
      const newItems = state.items.filter(i => i.menuItemId !== menuItemId);
      return { items: newItems, restaurantId: newItems.length === 0 ? null : state.restaurantId };
    }
    return {
      items: state.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i)
    };
  }),
  clearCart: () => set({ items: [], restaurantId: null })
}));

export const useOperationsStore = create((set) => ({
  orders: [], // [{ orderId, restaurantId, restaurantName, customerName, items, totalAmount, status, time, timestamp }]
  addOrder: (order) => set((state) => {
    if (state.orders.some(o => o.orderId === order.orderId)) return state; // Prevent duplicates
    return { orders: [{ ...order, timestamp: order.timestamp || Date.now() }, ...state.orders] };
  }),
  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: state.orders.map(o => o.orderId === orderId ? { ...o, status } : o)
  })),
  clearData: () => set({ orders: [] })
}));

