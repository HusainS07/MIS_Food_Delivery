const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

// We must manually define schemas here or require them.
// Since Next.js requires are ES modules with custom aliases, we define simplified versions for the seeder.
const UserSchema = new mongoose.Schema({
  fullName: String, email: String, passwordHash: String, role: String,
  address: { street: String, city: String, coordinates: { lat: Number, lng: Number } },
  availability: String
});
const RestaurantSchema = new mongoose.Schema({
  managerId: mongoose.Schema.Types.ObjectId, name: String, address: String,
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  cuisineType: [String], rating: { avg: Number, count: Number }, isActive: Boolean
});
const MenuItemSchema = new mongoose.Schema({
  restaurantId: mongoose.Schema.Types.ObjectId, name: String, description: String,
  price: Number, category: String, isAvailable: Boolean
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', RestaurantSchema);
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    console.log('Cleared existing data');

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Create Admin
    const admin = await User.create({
      fullName: 'System Admin', email: 'admin@mis.com', passwordHash, role: 'admin'
    });

    // 2. Create Operations Manager
    const ops = await User.create({
      fullName: 'Ops Manager', email: 'ops@mis.com', passwordHash, role: 'operations_manager'
    });

    // 3. Create Customers
    const customer = await User.create({
      fullName: 'John Doe', email: 'customer@mis.com', passwordHash, role: 'customer',
      address: { street: '123 Main St', city: 'Mumbai', coordinates: { lat: 19.0760, lng: 72.8777 } }
    });

    // 4. Create Delivery Partner
    const partner = await User.create({
      fullName: 'Fast Rider', email: 'rider@mis.com', passwordHash, role: 'delivery_partner',
      availability: 'available',
      address: { coordinates: { lat: 19.0800, lng: 72.8800 } }
    });

    // 5. Create Restaurant Manager & Restaurant
    const manager = await User.create({
      fullName: 'Chef Luigi', email: 'luigi@mis.com', passwordHash, role: 'restaurant_manager'
    });

    const restaurant = await Restaurant.create({
      managerId: manager._id,
      name: 'Luigi Pizza',
      address: '456 Food Ave, Mumbai',
      location: { coordinates: [72.8700, 19.0700] },
      cuisineType: ['Italian', 'Pizza'],
      rating: { avg: 4.8, count: 120 },
      isActive: true
    });

    // 6. Create Menu Items
    await MenuItem.insertMany([
      { restaurantId: restaurant._id, name: 'Margherita Pizza', description: 'Classic cheese pizza', price: 299, category: 'Main', isAvailable: true },
      { restaurantId: restaurant._id, name: 'Pepperoni Pizza', description: 'Spicy pepperoni', price: 399, category: 'Main', isAvailable: true },
      { restaurantId: restaurant._id, name: 'Garlic Bread', description: 'Toasted with butter', price: 149, category: 'Sides', isAvailable: true },
    ]);

    console.log('Database seeded successfully');
    console.log('Demo Accounts (password: password123):');
    console.log('- admin@mis.com');
    console.log('- ops@mis.com');
    console.log('- customer@mis.com');
    console.log('- rider@mis.com');
    console.log('- luigi@mis.com');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
