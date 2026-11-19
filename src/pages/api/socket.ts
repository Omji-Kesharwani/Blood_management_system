import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket } from "net";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Server } = require("socket.io");

export const config = {
  api: {
    bodyParser: false,
  },
};

type SocketServer = HTTPServer & {
  io?: any;
};

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket) {
    res.status(500).end();
    return;
  }

  const socket = res.socket as Socket & { server: SocketServer };
  if (socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(socket.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: { origin: "*" },
  });
  socket.server.io = io;

  io.on("connection", (client: any) => {
    client.on("join", (room: string) => {
      if (room) client.join(room);
    });
  });

  res.end();
}


