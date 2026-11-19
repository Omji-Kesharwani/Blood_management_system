import prisma from "@/app/libs/prismadb";
// @ts-ignore
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

async function notifyViaSendGrid(emails: string[], subject: string, content: string) {
  const env: any = (globalThis as any).process?.env || {};
  const apiKey = env.SENDGRID_API_KEY as string | undefined;
  const fromEmail = env.SENDGRID_FROM_EMAIL as string | undefined;
  if (!apiKey || !fromEmail) {
    console.log("[SOS] SendGrid not configured; skipping email notification.");
    return { sent: 0 };
  }

  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: emails.map((e) => ({ email: e })),
          subject,
        },
      ],
      from: { email: fromEmail },
      content: [{ type: "text/plain", value: content }],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.warn("[SOS] SendGrid error:", txt);
    return { sent: 0 };
  }
  return { sent: emails.length };
}

async function notifyViaTwilio(phones: string[], message: string) {
  const env: any = (globalThis as any).process?.env || {};
  const sid = env.TWILIO_ACCOUNT_SID as string | undefined;
  const token = env.TWILIO_AUTH_TOKEN as string | undefined;
  const from = env.TWILIO_FROM_NUMBER as string | undefined; // E.164, e.g., +12025550123
  if (!sid || !token || !from) {
    console.log("[SOS] Twilio not configured; skipping SMS notification.");
    return { sent: 0 };
  }
  const basic = (globalThis as any).Buffer
    ? (globalThis as any).Buffer.from(`${sid}:${token}`).toString("base64")
    : btoa(`${sid}:${token}`);
  let sent = 0;
  for (const to of phones) {
    try {
      const params = new URLSearchParams();
      params.append("To", to);
      params.append("From", from);
      params.append("Body", message);
      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      if (resp.ok) sent += 1;
    } catch {
      // continue
    }
  }
  return { sent };
}

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const {
      recipientName,
      recipientPhone,
      recipientEmail,
      bloodGroup,
      latitude,
      longitude,
      radiusKm = 10,
      message,
    } = body || {};

    if (
      !recipientName ||
      !recipientPhone ||
      !bloodGroup ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const sos = await prisma.recipientRequest.create({
      data: {
        recipientName,
        recipientPhone,
        recipientEmail,
        bloodGroup,
        latitude,
        longitude,
        radiusKm,
        message,
        status: "active",
      },
    });

    const donors = await prisma.donor.findMany({ where: { available: true } });
    const nearby = donors.filter((d: any) => {
      if (d.latitude == null || d.longitude == null) return false;
      if (!isCompatible(d.bloodGroup, bloodGroup)) return false;
      const dist = haversineKm(latitude, longitude, d.latitude, d.longitude);
      return dist <= radiusKm;
    });

    const emails = nearby.map((d: any) => d.email).filter(Boolean) as string[];
    const subject = `Emergency Blood Request: ${bloodGroup}`;
    const content = `SOS Request\n\nRecipient: ${recipientName}\nPhone: ${recipientPhone}\nBlood Group Needed: ${bloodGroup}\nMessage: ${message || ""}\nLocation: ${latitude}, ${longitude}\n\nIf you can help, please respond ASAP.`;

    const result = await notifyViaSendGrid(emails, subject, content);
    const phones = nearby.map((d: any) => d.phone).filter(Boolean) as string[];
    const smsResult = await notifyViaTwilio(phones as string[], content);

    // Emit real-time event via Socket.IO if available (pages api server)
    try {
      const env: any = (globalThis as any).process?.env || {};
      const base = (env.NEXT_PUBLIC_BASE_URL as string | undefined) || "";
      if (base) {
        await fetch(`${base}/api/broadcast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "sos:new", payload: { sos, donors: nearby.map((d: any) => d.id) } }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("[SOS] Socket emit skipped", e);
    }

    return NextResponse.json({
      success: true,
      request: sos,
      notifiedDonors: emails.length,
      notificationResult: { email: result, sms: smsResult },
    });
  } catch (err) {
    return NextResponse.json({ message: "SOS Error", err }, { status: 500 });
  }
};


