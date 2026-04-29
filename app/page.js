import { redirect } from 'next/navigation';

export default function Home() {
  // Simple redirect to customer dashboard for demo purposes.
  // In a real app, this would check auth and redirect appropriately or show a landing page.
  redirect('/customer');
}
