// Haversine Distance in km
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Route Optimizer using OpenRouteService or fallback A* straight line
export async function optimizeRoute(startCoords, endCoords) {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY;
  
  if (apiKey && apiKey !== 'YOUR_OPENROUTESERVICE_API_KEY') {
    try {
      // OpenRouteService expects coordinates as [longitude, latitude]
      const body = {
        coordinates: [
          [startCoords.lng, startCoords.lat],
          [endCoords.lng, endCoords.lat]
        ]
      };
      
      const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data; // GeoJSON FeatureCollection
      }
    } catch (err) {
      console.error('OpenRouteService Error, using fallback:', err);
    }
  }

  // Fallback: simple GeoJSON straight line
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          segments: [
            { distance: haversineDistance(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng) * 1000, duration: 600 }
          ]
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [startCoords.lng, startCoords.lat],
            [endCoords.lng, endCoords.lat]
          ]
        }
      }
    ]
  };
}
