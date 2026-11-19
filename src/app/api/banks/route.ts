import prisma from "@/app/libs/prismadb";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/api/_utils/auth";

export const GET = async () => {
  try {
    const banks = await prisma.bloodBank.findMany({
      take: 100, // Limit results
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(
      { success: true, banks },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ message: "BANK GET Error", err }, { status: 500 });
  }
};

export const POST = async (request: NextRequest) => {
  const forbidden = requireRole(request, ["admin"]);
  if (forbidden) return forbidden;
  try {
    const data = await request.json();
    const created = await prisma.bloodBank.create({ data });
    return NextResponse.json({ success: true, bank: created });
  } catch (err) {
    return NextResponse.json({ message: "BANK POST Error", err }, { status: 500 });
  }
};

export const PUT = async (request: NextRequest) => {
  const forbidden = requireRole(request, ["admin"]);
  if (forbidden) return forbidden;
  try {
    const body = await request.json();
    const { id, ...data } = body || {};
    if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });
    const updated = await prisma.bloodBank.update({ where: { id }, data });
    return NextResponse.json({ success: true, bank: updated });
  } catch (err) {
    return NextResponse.json({ message: "BANK PUT Error", err }, { status: 500 });
  }
};

export const DELETE = async (request: NextRequest) => {
  const forbidden = requireRole(request, ["admin"]);
  if (forbidden) return forbidden;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });
    await prisma.bloodBank.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ message: "BANK DELETE Error", err }, { status: 500 });
  }
};


