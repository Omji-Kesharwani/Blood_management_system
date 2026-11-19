"use client";

import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    initMap: () => void;
    google: any;
  }
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [map, setMap] = useState<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const circleRef = useRef<any | null>(null);
  const [gmapsReady, setGmapsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ donors: 0, banks: 0, sos: 0 });
  const [loading, setLoading] = useState(false);

  // Access environment variable correctly in Next.js client component
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if API key is available
    if (!apiKey) {
      setError("Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.");
      return;
    }

    // Check if Google Maps is already loaded
    if ((window as any).google && (window as any).google.maps) {
      setGmapsReady(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setGmapsReady(true));
      existingScript.addEventListener('error', () => setError("Failed to load Google Maps script."));
      return;
    }

    // Create and load script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
    script.async = true;
    script.defer = true;
    
    // Set up callback for when script loads
    script.onload = () => {
      // Wait a bit for google.maps to initialize
      const checkInterval = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(checkInterval);
          setGmapsReady(true);
          setError(null);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!(window as any).google || !(window as any).google.maps) {
          setError("Google Maps loaded but failed to initialize. Check browser console for errors.");
        }
      }, 5000);
    };

    script.onerror = () => {
      setError("Failed to load Google Maps. Please check your API key and ensure Maps JavaScript API is enabled in Google Cloud Console.");
      setGmapsReady(false);
    };

    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [apiKey]);

  // Get user location as map center
  useEffect(() => {
    if (!center && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCenter({ lat: 28.6139, lng: 77.2090 }) // fallback: New Delhi
      );
    }
  }, [center]);

  // Initialize map
  useEffect(() => {
    if (!center || !mapRef.current || !gmapsReady || !(window as any).google || map) return;
    const m = new (window as any).google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
    });
    setMap(m);
  }, [center, map, gmapsReady]);

  const fetchAndRender = useMemo(
    () =>
      async function run() {
        if (!map || !center || !gmapsReady || !(window as any).google) return;
        
        setLoading(true);
        
        // Clear existing markers and info windows
        markersRef.current.forEach((mk: any) => mk.setMap(null));
        markersRef.current = [];
        infoWindowsRef.current.forEach((iw: any) => iw.close());
        infoWindowsRef.current = [];
        
        if (circleRef.current) {
          circleRef.current.setMap(null);
          circleRef.current = null;
        }

        // Draw radius circle
        const circle = new (window as any).google.maps.Circle({
          strokeColor: "#4285F4",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#4285F4",
          fillOpacity: 0.15,
          map,
          center,
          radius: radiusKm * 1000,
        });
        circleRef.current = circle;

        try {
          // Fetch Donors
          const donorsRes = await fetch(`/api/donors/nearby?lat=${center.lat}&lon=${center.lng}&radiusKm=${radiusKm}`);
          const donorsJson = await donorsRes.json();
          const donors: any[] = donorsJson.donors || [];
          
          donors.forEach((d: any) => {
            const mk = new (window as any).google.maps.Marker({
              position: { lat: d.latitude, lng: d.longitude },
              map,
              title: `${d.firstName} ${d.lastName} (${d.bloodGroup})`,
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                scaledSize: new (window as any).google.maps.Size(32, 32),
              },
            });
            
            const infoWindow = new (window as any).google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; min-width: 200px;">
                  <h3 style="margin: 0 0 8px 0; color: #c53030; font-weight: bold;">🩸 Donor</h3>
                  <p style="margin: 4px 0;"><strong>Name:</strong> ${d.firstName} ${d.lastName}</p>
                  <p style="margin: 4px 0;"><strong>Blood Group:</strong> <span style="color: #c53030; font-weight: bold;">${d.bloodGroup}</span></p>
                  <p style="margin: 4px 0;"><strong>Distance:</strong> ${d.distanceKm?.toFixed(2) || 'N/A'} km</p>
                  <p style="margin: 4px 0;"><strong>Phone:</strong> ${d.phone || 'N/A'}</p>
                  <p style="margin: 4px 0;"><strong>Available:</strong> ${d.available ? '✅ Yes' : '❌ No'}</p>
                </div>
              `,
            });
            
            mk.addListener('click', () => {
              infoWindowsRef.current.forEach((iw: any) => iw.close());
              infoWindow.open(map, mk);
            });
            
            markersRef.current.push(mk);
            infoWindowsRef.current.push(infoWindow);
          });

          // Fetch Blood Banks
          const banksRes = await fetch(`/api/banks`);
          const banksJson = await banksRes.json();
          const banks: any[] = banksJson.banks || [];
          
          banks.forEach((bank: any) => {
            if (!bank.latitude || !bank.longitude) return;
            
            const mk = new (window as any).google.maps.Marker({
              position: { lat: bank.latitude, lng: bank.longitude },
              map,
              title: `${bank.name}`,
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new (window as any).google.maps.Size(32, 32),
              },
            });
            
            const stock = bank.stock || {};
            const stockList = Object.entries(stock)
              .map(([bg, qty]: [string, any]) => `<tr><td><strong>${bg}</strong></td><td style="text-align: center;">${qty} units</td></tr>`)
              .join('');
            
            const infoWindow = new (window as any).google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; min-width: 250px;">
                  <h3 style="margin: 0 0 8px 0; color: #2563eb; font-weight: bold;">🏥 ${bank.name}</h3>
                  <p style="margin: 4px 0;"><strong>Phone:</strong> ${bank.phone || 'N/A'}</p>
                  <p style="margin: 4px 0;"><strong>Email:</strong> ${bank.email || 'N/A'}</p>
                  <p style="margin: 4px 0;"><strong>Address:</strong> ${bank.address}, ${bank.city}, ${bank.state}</p>
                  ${stockList ? `
                    <div style="margin-top: 8px;">
                      <strong>Blood Stock:</strong>
                      <table style="width: 100%; margin-top: 4px; border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #f3f4f6;">
                            <th style="padding: 4px; text-align: left;">Blood Group</th>
                            <th style="padding: 4px; text-align: center;">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${stockList}
                        </tbody>
                      </table>
                    </div>
                  ` : '<p style="margin-top: 8px; color: #666;">Stock information not available</p>'}
                </div>
              `,
            });
            
            mk.addListener('click', () => {
              infoWindowsRef.current.forEach((iw: any) => iw.close());
              infoWindow.open(map, mk);
            });
            
            markersRef.current.push(mk);
            infoWindowsRef.current.push(infoWindow);
          });

          // Fetch Active SOS
          const sosRes = await fetch(`/api/requests/active`);
          const sosJson = await sosRes.json();
          const requests: any[] = sosJson.requests || [];
          
          requests.forEach((r: any) => {
            const mk = new (window as any).google.maps.Marker({
              position: { lat: r.latitude, lng: r.longitude },
              map,
              title: `SOS: ${r.bloodGroup} (${r.recipientName})`,
              icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new (window as any).google.maps.Size(32, 32),
              },
            });
            
            const infoWindow = new (window as any).google.maps.InfoWindow({
              content: `
                <div style="padding: 8px; min-width: 200px;">
                  <h3 style="margin: 0 0 8px 0; color: #dc2626; font-weight: bold;">🆘 Emergency Request</h3>
                  <p style="margin: 4px 0;"><strong>Blood Group Needed:</strong> <span style="color: #dc2626; font-weight: bold;">${r.bloodGroup}</span></p>
                  <p style="margin: 4px 0;"><strong>Recipient:</strong> ${r.recipientName}</p>
                  <p style="margin: 4px 0;"><strong>Phone:</strong> ${r.recipientPhone}</p>
                  ${r.message ? `<p style="margin: 4px 0;"><strong>Message:</strong> ${r.message}</p>` : ''}
                  <p style="margin: 4px 0; color: #666; font-size: 12px;">Radius: ${r.radiusKm} km</p>
                </div>
              `,
            });
            
            mk.addListener('click', () => {
              infoWindowsRef.current.forEach((iw: any) => iw.close());
              infoWindow.open(map, mk);
            });
            
            markersRef.current.push(mk);
            infoWindowsRef.current.push(infoWindow);
          });
          
          setStats({ donors: donors.length, banks: banks.length, sos: requests.length });
        } catch (err) {
          console.error("Error fetching map data:", err);
        } finally {
          setLoading(false);
        }
      },
    [map, center, radiusKm, gmapsReady]
  );

  useEffect(() => {
    fetchAndRender();
  }, [fetchAndRender]);

  if (error) {
    return (
      <div className="w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold text-xl mb-2">⚠️ Map Loading Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">To fix this:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file in your project root</li>
              <li>Add: <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
              <li>Get your API key from <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
              <li>Restart your dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!gmapsReady || !center) {
    return (
      <div className="w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-4 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col gap-2 p-4">
      {/* Controls and Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center gap-4 flex-1">
          <label className="text-sm font-medium whitespace-nowrap">Radius: {radiusKm} km</label>
          <input
            type="range"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadiusKm(parseInt(e.target.value, 10))}
            className="flex-1"
          />
        </div>
        
        {/* Statistics */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span><strong>{stats.donors}</strong> Donors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span><strong>{stats.banks}</strong> Banks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span><strong>{stats.sos}</strong> SOS</span>
          </div>
        </div>
        
        {loading && (
          <div className="text-sm text-gray-500">Loading...</div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={mapRef} className="w-full h-full rounded-md border shadow-lg" />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg z-10">
          <h4 className="font-bold text-sm mb-2">Legend</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Donors</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Blood Banks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Emergency SOS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


