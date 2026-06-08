'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useContestSocket } from '@/hooks/use-contest-socket';
import { CheckCircle2, Clock, Trash2, Trophy, Users, Wifi, WifiOff } from 'lucide-react';
import type { LeaderboardEntry } from '@/lib/leaderboard';

type ContestProblem = {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  basePoints: number;
  acceptedCount: number;
  order?: number;
};

type ContestDetailClientProps = {
  contestId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  timing: 'UPCOMING' | 'ACTIVE' | 'ENDED';
  canAttempt: boolean;
  isRegistered: boolean;
  isVisible: boolean;
  isAdmin: boolean;
  registrationCount: number;
  problems: ContestProblem[];
  initialLeaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  isSignedIn: boolean;
  solvedProblemIds: string[];
};

const timingStyles = {
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  ENDED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

function getTiming(startTime: string, endTime: string, now: Date) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) return 'UPCOMING';
  if (now > end) return 'ENDED';
  return 'ACTIVE';
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s remaining`;
  if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
  return `${seconds}s remaining`;
}

function getTimerLabel(startTime: string, endTime: string, now: Date) {
  const liveTiming = getTiming(startTime, endTime, now);

  if (liveTiming === 'UPCOMING') {
    return `Starts in ${formatRemaining(new Date(startTime).getTime() - now.getTime())}`;
  }

  if (liveTiming === 'ACTIVE') {
    return `Ends in ${formatRemaining(new Date(endTime).getTime() - now.getTime())}`;
  }

  return 'Ended';
}

export function ContestDetailClient({
  contestId,
  title,
  description,
  startTime,
  endTime,
  isRegistered: initialRegistered,
  isVisible,
  isAdmin,
  registrationCount,
  problems,
  initialLeaderboard,
  userRank: initialUserRank,
  isSignedIn,
  solvedProblemIds,
}: ContestDetailClientProps) {
  const router = useRouter();
  const [isRegistered, setIsRegistered] = useState(initialRegistered);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [visible, setVisible] = useState(isVisible);
  const [registeredCount, setRegisteredCount] = useState(registrationCount);
  const [now, setNow] = useState(() => new Date());

  const { leaderboard, timerLabel: socketTimerLabel, recentSubmission, connected } =
    useContestSocket(contestId, isRegistered || isAdmin);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const liveTiming = useMemo(
    () => getTiming(startTime, endTime, now),
    [startTime, endTime, now],
  );
  const solvedIds = useMemo(() => {
    const ids = new Set(solvedProblemIds);
    if (recentSubmission?.status === 'ACCEPTED') {
      ids.add(recentSubmission.problemId);
    }
    return ids;
  }, [recentSubmission, solvedProblemIds]);
  const timerLabel = connected
    ? socketTimerLabel
    : getTimerLabel(startTime, endTime, now);
  const liveCanAttempt = liveTiming === 'ACTIVE';

  const displayLeaderboard =
    leaderboard.length > 0 ? leaderboard : initialLeaderboard;
  const userRank =
    initialUserRank && leaderboard.length > 0
      ? leaderboard.find((entry) => entry.userId === initialUserRank.userId) ??
        initialUserRank
      : initialUserRank;

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const response = await fetch(`/api/contests/${contestId}/register`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Registration failed');
        return;
      }
      setIsRegistered(true);
      setRegisteredCount((count) => count + (isRegistered ? 0 : 1));
    } catch {
      alert('Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleVisibility = useCallback(async () => {
    const next = !visible;
    const response = await fetch(`/api/contests/${contestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: next }),
    });
    if (response.ok) {
      setVisible(next);
    } else {
      alert('Failed to update visibility');
    }
  }, [contestId, visible]);

  const deleteContest = async () => {
    if (!confirm('Delete this contest permanently?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contests/${contestId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to delete contest');
        return;
      }

      router.push('/contests');
    } catch {
      alert('Failed to delete contest');
    } finally {
      setIsDeleting(false);
    }
  };

  const canSeeProblems =
    isAdmin || liveTiming === 'ENDED' || (liveTiming === 'ACTIVE' && isRegistered);
  const canAttemptProblems =
    isAdmin || (liveTiming === 'ACTIVE' && isRegistered);
  const canSeeLeaderboard =
    isAdmin || liveTiming === 'ENDED' || (liveTiming === 'ACTIVE' && isRegistered);

  const startAttempt = async (problemId: string) => {
    if (!canAttemptProblems) return;

    const response = await fetch(`/api/contests/${contestId}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemId }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Could not start attempt');
      return;
    }

    router.push(data.url);
  };

  return (
    <div className='w-full max-w-5xl space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center gap-2 mb-2'>
            <Badge className={timingStyles[liveTiming]}>{liveTiming}</Badge>
            {connected ? (
              <Badge variant='outline' className='gap-1'>
                <Wifi className='w-3 h-3' /> Live
              </Badge>
            ) : (
              <Badge variant='secondary' className='gap-1'>
                <WifiOff className='w-3 h-3' /> Offline
              </Badge>
            )}
            {!visible && isAdmin && (
              <Badge variant='destructive'>Hidden</Badge>
            )}
          </div>
          <CardTitle className='text-2xl'>{title}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground'>{description}</p>
          <div className='flex flex-wrap gap-4 text-sm text-muted-foreground'>
            <span className='flex items-center gap-1'>
              <Clock className='w-4 h-4' />
              {new Date(startTime).toLocaleString()} —{' '}
              {new Date(endTime).toLocaleString()}
            </span>
            <span className='flex items-center gap-1'>
              <Users className='w-4 h-4' />
              {registeredCount} registered
            </span>
            <span className='flex items-center gap-1 font-medium text-foreground'>
              <Trophy className='w-4 h-4' />
              {timerLabel}
            </span>
          </div>

          {isAdmin && (
            <div className='flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border'>
              <div className='flex items-center gap-3'>
                <Switch checked={visible} onCheckedChange={toggleVisibility} id='contest-visible' />
                <Label htmlFor='contest-visible'>Visible to users</Label>
              </div>
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={deleteContest}
                disabled={isDeleting}
              >
                <Trash2 className='w-4 h-4 mr-2' />
                {isDeleting ? 'Deleting...' : 'Delete Contest'}
              </Button>
            </div>
          )}

          {!isSignedIn && (
            <p className='text-sm p-3 rounded-md bg-muted'>
              Sign in to register and participate in this contest.
            </p>
          )}

          {isSignedIn && !isRegistered && liveTiming !== 'ENDED' && !isAdmin && (
            <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-md bg-blue-50 dark:bg-blue-950/40'>
              <p className='text-sm flex-1'>
                Register to access contest problems and appear on the leaderboard.
              </p>
              <Button onClick={handleRegister} disabled={isRegistering}>
                {isRegistering ? 'Registering...' : 'Register for Contest'}
              </Button>
            </div>
          )}

          {liveTiming === 'UPCOMING' && (
            <p className='text-sm p-3 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'>
              Contest problems unlock when the timer reaches zero.
            </p>
          )}

          {isRegistered && (
            <p className='text-sm p-3 rounded-md bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-200'>
              You are registered. {liveCanAttempt ? 'Contest is live. Good luck!' : liveTiming === 'UPCOMING' ? 'Contest has not started yet.' : 'Contest has ended.'}
            </p>
          )}

          {recentSubmission && (
            <p className='text-xs text-muted-foreground animate-pulse'>
              Latest: {recentSubmission.displayName} submitted on problem —{' '}
              {recentSubmission.status}
            </p>
          )}
        </CardContent>
      </Card>

      {userRank && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Your Rank</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-6 text-sm'>
            <span>
              <strong>Rank:</strong> #{userRank.rank}
            </span>
            <span>
              <strong>Solved:</strong> {userRank.solvedCount}
            </span>
            <span>
              <strong>Score:</strong> {userRank.score}
            </span>
            <span>
              <strong>Penalty:</strong> {userRank.penaltyMinutes} min
            </span>
          </CardContent>
        </Card>
      )}

      {canSeeLeaderboard && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Trophy className='w-5 h-5' />
              Live Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayLeaderboard.length === 0 ? (
              <p className='text-sm text-muted-foreground'>No submissions yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Total Score</TableHead>
                    <TableHead>Problems Solved</TableHead>
                    <TableHead>Penalty Time</TableHead>
                    <TableHead>Last Submission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayLeaderboard.map((entry) => (
                    <TableRow key={entry.userId}>
                      <TableCell>#{entry.rank}</TableCell>
                      <TableCell>{entry.displayName}</TableCell>
                      <TableCell>{entry.score}</TableCell>
                      <TableCell>{entry.solvedCount}</TableCell>
                      <TableCell>{entry.penaltyMinutes} min</TableCell>
                      <TableCell>
                        {entry.lastSubmissionAt
                          ? new Date(entry.lastSubmissionAt).toLocaleTimeString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className='text-lg font-semibold mb-4'>Problems</h2>
        {!canSeeProblems ? (
          <p className='text-sm text-muted-foreground'>
            {liveTiming === 'UPCOMING'
              ? 'Problems are hidden until the contest starts.'
              : 'Register for the contest to unlock problems.'}
          </p>
        ) : (
          <div className='grid gap-3'>
            {problems.map((problem, index) => (
              <Card key={problem.id}>
                <CardContent className='flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='space-y-2'>
                    <span className='text-muted-foreground text-sm mr-2'>
                      #{index + 1}
                    </span>
                    <span className='font-medium'>{problem.title}</span>
                    {solvedIds.has(problem.id) && (
                      <Badge className='ml-2 gap-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'>
                        <CheckCircle2 className='w-3 h-3' />
                        Completed
                      </Badge>
                    )}
                    <Badge className='ml-2' variant='secondary'>
                      {problem.difficulty}
                    </Badge>
                    <div className='flex flex-wrap gap-2 text-xs'>
                      <Badge variant='outline'>{problem.basePoints} pts</Badge>
                      <Badge variant='outline'>{problem.acceptedCount} solve(s)</Badge>
                      {problem.tags.map((tag) => (
                        <Badge key={tag} variant='secondary'>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {solvedIds.has(problem.id) ? (
                    <Button size='sm' variant='outline' disabled>
                      <CheckCircle2 className='w-4 h-4 mr-2' />
                      Completed
                    </Button>
                  ) : canAttemptProblems ? (
                    <Button size='sm' onClick={() => startAttempt(problem.id)}>
                      Attempt Problem
                    </Button>
                  ) : (
                    <Link href={`/problems/${problem.id}?contestId=${contestId}`}>
                      <Button size='sm' variant='outline'>
                        View Problem
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
