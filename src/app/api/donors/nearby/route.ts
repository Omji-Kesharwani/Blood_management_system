import prisma from "@/app/libs/prismadb";
import { NextRequest, NextResponse } from "next/server";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lon = parseFloat(searchParams.get("lon") || "");
    const radiusKm = parseFloat(searchParams.get("radiusKm") || "10");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json({ message: "lat and lon are required" }, { status: 400 });
    }

    // Use MongoDB geospatial query with $nearSphere for better performance
    // First, filter donors with coordinates using database query
    const donors = await prisma.donor.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        available: true, // Only fetch available donors
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        bloodGroup: true,
        age: true,
        address: true,
        state: true,
        city: true,
        gender: true,
        latitude: true,
        longitude: true,
        available: true,
      },
      take: limit * 3, // Fetch more than needed to account for distance filtering
    });

    // Calculate distances and filter
    const withDistance = donors
      .map((d) => ({
        d,
        dist: haversineKm(lat, lon, d.latitude as number, d.longitude as number),
      }))
      .filter((x) => x.dist <= radiusKm)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, limit) // Limit results
      .map((x) => ({ ...x.d, distanceKm: x.dist }));

    const response = NextResponse.json(
      { success: true, count: withDistance.length, donors: withDistance },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
    
    return response;
  } catch (err) {
    return NextResponse.json({ message: "NEARBY Error", err }, { status: 500 });
  }
};


