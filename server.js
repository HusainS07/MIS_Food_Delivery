const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create standard HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Attach Socket.io to the server
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Make IO globally available so API routes can use it (e.g., via global.io)
  global.io = io;

  // Setup basic socket listeners
  io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Join room for specific order
    socket.on('join_order_room', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} joined room order:${orderId}`);
    });

    // Join room for specific restaurant
    socket.on('join_restaurant_room', (restaurantId) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`Socket ${socket.id} joined room restaurant:${restaurantId}`);
    });

    // Join room for live operations
    socket.on('join_ops_room', () => {
      socket.join('operations:live');
      console.log(`Socket ${socket.id} joined operations:live`);
    });

    // Delivery partner sending GPS update
    socket.on('partner:location_update', (data) => {
      // Broadcast to order room
      if (data.orderId) {
        io.to(`order:${data.orderId}`).emit('order:location_update', {
          lat: data.lat,
          lng: data.lng,
          partnerId: data.partnerId,
          timestamp: new Date()
        });
      }
      // Broadcast to operations room
      io.to('operations:live').emit('ops:partner_location', {
        lat: data.lat,
        lng: data.lng,
        partnerId: data.partnerId,
        timestamp: new Date()
      });
    });

    // --- FILE BASED PERSISTENCE ---
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'data');
    const dataFile = path.join(dataDir, 'orders.json');
    
    let storedOrders = [];
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      if (fs.existsSync(dataFile)) storedOrders = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      else fs.writeFileSync(dataFile, JSON.stringify([]));
    } catch (e) {
      console.error("Persistence Error:", e);
    }
    // --------------------------------

    // Send initial data to client on connect
    socket.emit('hydrate_orders', storedOrders);

    // Handle new order placed
    socket.on('place_new_order', (orderData) => {
      // Append to memory and file
      storedOrders.unshift(orderData);
      fs.writeFileSync(dataFile, JSON.stringify(storedOrders));

      // Broadcast
      io.emit('restaurant:new_order', orderData);
      io.emit('ops:order_placed', orderData);
    });

    // Handle order status updates
    socket.on('update_order_status', (data) => {
      // Update in memory and file
      storedOrders = storedOrders.map(o => o.orderId === data.orderId ? { ...o, status: data.status } : o);
      fs.writeFileSync(dataFile, JSON.stringify(storedOrders));

      io.emit('order:status_update', data);
      io.emit('ops:order_status_update', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
