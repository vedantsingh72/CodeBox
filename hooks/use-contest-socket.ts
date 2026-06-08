'use client';

import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SOCKET_EVENTS,
  type ContestTimerPayload,
  type LeaderboardUpdatePayload,
  type SubmissionUpdatePayload,
} from '@/lib/socket-events';
import type { LeaderboardEntry } from '@/lib/leaderboard';

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function useContestSocket(contestId: string, enabled = true) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [timer, setTimer] = useState<ContestTimerPayload | null>(null);
  const [recentSubmission, setRecentSubmission] =
    useState<SubmissionUpdatePayload | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !contestId) return;

    let socket: Socket | null = null;

    const init = async () => {
      await fetch(`/api/socketio?EIO=4&transport=polling`).catch(() => null);

      socket = io({
        path: '/api/socketio',
        addTrailingSlash: false,
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        setConnected(true);
        socket?.emit(SOCKET_EVENTS.JOIN_CONTEST, contestId);
      });

      socket.on('disconnect', () => setConnected(false));

      socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (payload: LeaderboardUpdatePayload) => {
        if (payload.contestId === contestId) {
          setLeaderboard(payload.leaderboard);
        }
      });

      socket.on(SOCKET_EVENTS.CONTEST_TIMER, (payload: ContestTimerPayload) => {
        if (payload.contestId === contestId) {
          setTimer(payload);
        }
      });

      socket.on(SOCKET_EVENTS.SUBMISSION_UPDATE, (payload: SubmissionUpdatePayload) => {
        if (payload.contestId === contestId) {
          setRecentSubmission(payload);
        }
      });
    };

    init();

    return () => {
      socket?.emit(SOCKET_EVENTS.LEAVE_CONTEST, contestId);
      socket?.disconnect();
    };
  }, [contestId, enabled]);

  const timerLabel = useMemo(() => {
    if (!timer) return '--:--';
    if (timer.timing === 'ENDED') return 'Ended';
    if (timer.timing === 'UPCOMING') {
      return `Starts in ${formatDuration(timer.remainingMs)}`;
    }
    return formatDuration(timer.remainingMs);
  }, [timer]);

  return {
    leaderboard,
    timer,
    timerLabel,
    recentSubmission,
    connected,
  };
}
