"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Map, LayoutDashboard, UtensilsCrossed, FileText, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/app/store/useStore';
import { SocketProvider } from '@/app/components/realtime/SocketProvider';

const navItems = {
  customer: [
    { name: 'Home', path: '/customer', icon: LayoutDashboard },
    { name: 'My Orders', path: '/customer/orders', icon: FileText },
  ],
  restaurant_manager: [
    { name: 'Orders Board', path: '/restaurant', icon: LayoutDashboard },
    { name: 'Menu Management', path: '/restaurant/menu', icon: UtensilsCrossed },
    { name: 'Reports', path: '/restaurant/reports', icon: FileText },
  ],
  delivery_partner: [
    { name: 'Active Delivery', path: '/delivery', icon: Map },
    { name: 'History', path: '/delivery/history', icon: FileText },
  ],
  operations_manager: [
    { name: 'Dashboard', path: '/operations', icon: LayoutDashboard },
    { name: 'Live Map', path: '/operations/map', icon: Map },
    { name: 'Restaurant Analytics', path: '/restaurant-analytics', icon: FileText },
  ],
  admin: [
    { name: 'Overview', path: '/admin', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: UserIcon },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ]
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Note: In real app we'd redirect if not logged in. For dev, we will mock it if empty.
  }, []);

  const role = user?.role || 'admin'; // Default for demo if not logged in
  const items = navItems[role] || [];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <SocketProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card shadow-sm flex flex-col hidden md:flex">
          <div className="p-6 border-b border-border">
            <h1 className="text-2xl font-bold tracking-tight text-primary">FoodMIS</h1>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{role.replace('_', ' ')} Portal</p>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="space-y-6 px-3">
              {Object.entries(navItems).map(([roleGroup, groupItems]) => (
                <div key={roleGroup}>
                  <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {roleGroup.replace('_', ' ')}
                  </h3>
                  <ul className="space-y-1">
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.path;
                      return (
                        <li key={item.path}>
                          <Link href={item.path}>
                            <span className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                              isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`}>
                              <Icon className="h-4 w-4" />
                              {item.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{user?.fullName || 'Guest'}</span>
                <span className="text-xs text-muted-foreground mt-1">{user?.email || 'guest@demo.com'}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
            <h1 className="text-xl font-bold text-primary">FoodMIS</h1>
            <UserIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
