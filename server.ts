import "dotenv/config";
import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { prisma as db } from "./lib/prisma";
import {
  broadcastLeaderboardUpdate,
  buildTimerPayload,
  emitContestTimer,
} from "./lib/contest-socket";
import { SOCKET_EVENTS } from "./lib/socket-events";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const timerIntervals = new Map<string, NodeJS.Timeout>();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: dev ? "*" : undefined,
    },
  });

  globalThis.socketIo = io;

  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN_CONTEST, async (contestId: string) => {
      if (!contestId || typeof contestId !== "string") return;

      const room = `contest:${contestId}`;
      socket.join(room);

      const contest = await db.contest.findUnique({
        where: { id: contestId },
        select: { contestStartTime: true, contestEndTime: true },
      });

      if (contest) {
        socket.emit(
          SOCKET_EVENTS.CONTEST_TIMER,
          buildTimerPayload(contestId, contest.contestStartTime, contest.contestEndTime),
        );
      }

      await broadcastLeaderboardUpdate(contestId);

      if (!timerIntervals.has(contestId)) {
        const interval = setInterval(async () => {
          const current = await db.contest.findUnique({
            where: { id: contestId },
            select: { contestStartTime: true, contestEndTime: true },
          });
          if (!current) return;
          emitContestTimer(io, contestId, current.contestStartTime, current.contestEndTime);
        }, 1000);
        timerIntervals.set(contestId, interval);
      }
    });

    socket.on(SOCKET_EVENTS.LEAVE_CONTEST, (contestId: string) => {
      if (!contestId) return;
      socket.leave(`contest:${contestId}`);
    });

    socket.on("disconnect", () => {
      // Timer intervals are shared per contest room; cleaned on process exit.
    });
  });

  httpServer.listen(port, () => {
    console.log(`> GFGCodeBox ready on http://${hostname}:${port}`);
  });
});
