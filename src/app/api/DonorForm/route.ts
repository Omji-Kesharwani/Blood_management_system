import prisma from "@/app/libs/prismadb"
import { NextRequest, NextResponse } from "next/server"

export const POST = async (request: NextRequest, response: NextResponse) => {
    try {
        const body = await request.json();
        const { firstName, lastName, phone, email, bloodGroup, age, address, state, city, gender, latitude, longitude, lastDonation, available, role } = body;

        const newDonor = await prisma.donor.create({
            data: {
                firstName,
                lastName,
                phone,
                email,
                bloodGroup,
                age,
                address,
                state,
                city,
                gender,
                latitude,
                longitude,
                lastDonation: lastDonation ? new Date(lastDonation) : undefined,
                available: typeof available === 'boolean' ? available : undefined,
                role: role || undefined
            }
        });
        return NextResponse.json(newDonor);
    } catch (err) {
        return NextResponse.json({ message: "POST Error", err }, { status: 500 })
    }
}

export const GET = async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const bloodGroup = searchParams.get("bloodGroup");
        const skip = (page - 1) * limit;

        const where = bloodGroup 
          ? { bloodGroup, available: true }
          : { available: true };

        const [Donors, total] = await Promise.all([
          prisma.donor.findMany({
            where,
            skip,
            take: limit,
            orderBy: { id: 'desc' },
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
            },
          }),
          prisma.donor.count({ where }),
        ]);

        const response = NextResponse.json({
            message: "Donors fetched successfully",
            success: true,
            Donors,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          }, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            },
          });      
          return response;
    } catch (err) {
        return NextResponse.json({ message: "GET Error", err }, { status: 500 })
    }
}