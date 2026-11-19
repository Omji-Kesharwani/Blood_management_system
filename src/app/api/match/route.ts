import prisma from "@/app/libs/prismadb";
import { NextRequest, NextResponse } from "next/server";

type MatchRequestBody = {
  bloodGroup: string;
  latitude: number;
  longitude: number;
  maxDistanceKm?: number; // optional search radius
  weights?: {
    distance?: number; // smaller distance -> higher score
    availability?: number; // available donors get this weight
    recency?: number; // more recent donation reduces likelihood; older donation increases score
  };
};

function haversineKm(lat1: number, lon1: number, lat2?: number | null, lon2?: number | null): number | null {
  if (lat2 == null || lon2 == null) return null;
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

// Basic ABO/Rh compatibility rules
function isCompatible(donorGroup: string, recipientGroup: string): boolean {
  const map: Record<string, string[]> = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
  };
  const canDonateTo = map[donorGroup?.toUpperCase?.() || ""] || [];
  return canDonateTo.includes(recipientGroup?.toUpperCase?.());
}

export const POST = async (request: NextRequest) => {
  try {
    const body = (await request.json()) as MatchRequestBody;
    const { bloodGroup, latitude, longitude, maxDistanceKm = 50, weights } = body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !bloodGroup
    ) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 }
      );
    }

    const w = {
      distance: weights?.distance ?? 0.6,
      availability: weights?.availability ?? 0.25,
      recency: weights?.recency ?? 0.15,
    };

    // Fetch only available donors with coordinates to reduce data transfer
    const donors = await prisma.donor.findMany({
      where: {
        bloodGroup: { not: undefined },
        available: true,
        latitude: { not: null },
        longitude: { not: null },
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
        lastDonation: true,
        available: true,
      },
      take: 500, // Limit initial fetch
    });

    const candidates = donors
      .filter((d) => isCompatible(d.bloodGroup, bloodGroup))
      .map((d) => {
        const distanceKm = haversineKm(latitude, longitude, d.latitude, d.longitude);
        return { donor: d, distanceKm } as const;
      })
      .filter((x) => x.distanceKm != null && (x.distanceKm as number) <= maxDistanceKm);

    // Normalize components for scoring
    const maxDistance = candidates.reduce((m, c) => Math.max(m, c.distanceKm as number), 1);

    const now = Date.now();
    const recencyDays = (lastDonation?: Date | null) =>
      lastDonation ? Math.max(0, (now - new Date(lastDonation).getTime()) / (1000 * 60 * 60 * 24)) : 9999;
    const maxRecency = candidates.reduce(
      (m, c) => Math.max(m, recencyDays(c.donor.lastDonation as Date | null)),
      1
    );

    const scored = candidates.map((c) => {
      const distanceComponent = 1 - (c.distanceKm as number) / maxDistance; // closer is better
      const availabilityComponent = c.donor.available ? 1 : 0;
      const recencyComponent = Math.min(1, recencyDays(c.donor.lastDonation as Date | null) / maxRecency);

      const score =
        w.distance * distanceComponent +
        w.availability * availabilityComponent +
        w.recency * recencyComponent;

      return {
        donor: c.donor,
        distanceKm: c.distanceKm,
        score,
        components: {
          distanceComponent,
          availabilityComponent,
          recencyComponent,
        },
      };
    });

    scored.sort((a, b) => b.score - a.score);

    // Limit results to top matches
    const topMatches = scored.slice(0, 50);

    return NextResponse.json(
      {
        success: true,
        count: topMatches.length,
        donors: topMatches,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ message: "MATCH Error", err }, { status: 500 });
  }
};


