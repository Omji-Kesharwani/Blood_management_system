import { NextRequest, NextResponse } from "next/server";

export type Role = "donor" | "recipient" | "admin";

export function getRoleFromRequest(req: NextRequest): Role {
  const headerRole = (req.headers.get("x-role") || "").toLowerCase();
  if (headerRole === "admin" || headerRole === "recipient" || headerRole === "donor") {
    return headerRole as Role;
  }
  // Fallback: allow middleware/cookie-based auth systems to inject role later
  return "donor";
}

export function requireRole(req: NextRequest, roles: Role[]): NextResponse | null {
  const role = getRoleFromRequest(req);
  if (!roles.includes(role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return null;
}


