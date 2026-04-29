"use client";
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function Map({ center, partnerLocation, routeCoords }) {
  useEffect(() => {
    // Fix default icon issue with Leaflet in React
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer 
      center={center || [19.1389, 72.8406]} 
      zoom={14} 
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {partnerLocation && (
        <Marker position={[partnerLocation.lat, partnerLocation.lng]} />
      )}
      
      {routeCoords && routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="hsl(var(--primary))" weight={5} opacity={0.7} />
      )}
    </MapContainer>
  );
}
