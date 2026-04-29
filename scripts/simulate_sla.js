const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected to server. Injecting 50 simulated orders...");

  const restaurants = [
    { name: "Spice Route", items: "Butter Chicken, Naan" },
    { name: "Burger Hub", items: "Double Cheeseburger" },
    { name: "Luigi Pizza", items: "Margherita Pizza" },
    { name: "Wok This Way", items: "Pad Thai" }
  ];

  for (let i = 0; i < 50; i++) {
    const restaurant = restaurants[Math.floor(Math.random() * restaurants.length)];
    const isDelayed = i < 5; // Make the first 5 orders delayed by 20 minutes to trigger SLA

    const orderData = {
      orderId: `sim_sla_${Math.floor(Math.random() * 100000)}`,
      customerName: `Test User ${i}`,
      restaurantName: restaurant.name,
      items: restaurant.items,
      totalAmount: Math.floor(Math.random() * 800) + 200,
      timestamp: isDelayed ? Date.now() - (20 * 60000) : Date.now(), // 20 mins ago for SLA breach
      time: new Date(isDelayed ? Date.now() - (20 * 60000) : Date.now()).toLocaleTimeString(),
      status: isDelayed ? 'preparing' : 'placed' // Keep them in preparing to trigger alert
    };

    socket.emit("place_order", orderData);
  }

  console.log("✅ Injected 50 orders! (5 of them have 20-minute prep delays to trigger SLA penalties).");
  
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 1000);
});
