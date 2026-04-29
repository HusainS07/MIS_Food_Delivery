"use client";
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">Loading Map...</div>
});

export default function LiveMap(props) {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-border shadow-sm">
      <MapComponent {...props} />
    </div>
  );
}
