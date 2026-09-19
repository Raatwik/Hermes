import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet with webpack/vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A custom drone icon
const droneIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3233/3233816.png', // A simple drone icon from flaticon or similar
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: 'drone-marker-icon'
});

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export default function MapWidget({ currentPosition, checkpoints }) {
  const defaultCenter = [51.505, -0.09]; // London as default placeholder
  const center = currentPosition || defaultCenter;
  
  // Create polyline from checkpoints
  const path = checkpoints ? checkpoints.map(cp => [cp.lat, cp.lng]) : [];
  
  return (
    <div className="map-widget-container" style={{ height: '100%', width: '100%', position: 'relative', borderRadius: '0', overflow: 'hidden', border: '1px solid #cccccc' }}>
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%', backgroundColor: '#222222' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        
        {/* Draw planned path (Gray) */}
        {path.length > 0 && (
          <Polyline positions={path} color="#888888" weight={3} dashArray="5, 8" />
        )}

        {/* Draw flown path (Blue, from start to current drone pos) */}
        {path.length > 0 && (
          <Polyline positions={[path[0], center]} color="#3b82f6" weight={4} />
        )}
        
        {/* Draw checkpoints */}
        {checkpoints && checkpoints.map((cp, idx) => {
          const phases = ['TAKEOFF / CLIMB', 'CRUISE / LOITER', 'RETURN / LANDING'];
          return (
            <Marker key={idx} position={[cp.lat, cp.lng]}>
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent>
                <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{phases[idx] || `WAYPOINT ${idx + 1}`}</span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Draw Drone */}
        <Marker position={center} icon={droneIcon} zIndexOffset={1000} />
        
        {/* Draw UAV Range Radius */}
        <Circle 
          center={center} 
          radius={12000} 
          pathOptions={{ color: '#ff9900', dashArray: '5, 10', fillOpacity: 0.1, weight: 2 }} 
        />
        
        <MapController center={center} />
      </MapContainer>
      
      {/* Overlay to look like the reference image */}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 400, backgroundColor: 'rgba(30, 30, 30, 0.9)', padding: '4px 8px', border: '1px solid #444444', fontSize: '12px', fontWeight: 'bold', color: '#eeeeee', borderRadius: '4px' }}>
        <span style={{ color: '#ff4444', marginRight: '5px' }}>●</span> LIVE TRACKING
      </div>
    </div>
  );
}
