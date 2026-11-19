import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { event, payload } = req.body || {};
    // @ts-ignore - the socket server is attached by /api/socket
    const io = (res.socket as any)?.server?.io;
    if (!io) return res.status(202).json({ message: "Socket server not initialized" });
    io.emit(event || "broadcast", payload || {});
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ message: "Broadcast error" });
  }
}


