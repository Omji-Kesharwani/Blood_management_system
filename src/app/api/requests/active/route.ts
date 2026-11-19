import prisma from "@/app/libs/prismadb";
import { NextResponse } from "next/server";

export const GET = async () => {
  try {
    const requests = await prisma.recipientRequest.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit results
    });
    return NextResponse.json(
      { success: true, requests },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ message: "REQUESTS Error", err }, { status: 500 });
  }
};


