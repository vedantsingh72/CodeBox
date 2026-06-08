'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Trophy, Users } from 'lucide-react';

type Contest = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  timing: 'UPCOMING' | 'ACTIVE' | 'ENDED';
  problemCount: number;
  registrationCount: number;
  isRegistered: boolean;
};

const timingStyles = {
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  ENDED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

function getTiming(
  startTime: string,
  endTime: string,
  now: Date,
): Contest['timing'] {
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

function getTimerLabel(contest: Contest, now: Date) {
  const timing = getTiming(contest.startTime, contest.endTime, now);

  if (timing === 'UPCOMING') {
    return `Starts in ${formatRemaining(new Date(contest.startTime).getTime() - now.getTime())}`;
  }

  if (timing === 'ACTIVE') {
    return `Ends in ${formatRemaining(new Date(contest.endTime).getTime() - now.getTime())}`;
  }

  return 'Ended';
}

export function ContestsList() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    fetch('/api/contests')
      .then((r) => r.json())
      .then((d) => setContests(d.contests || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleContests = useMemo(
    () =>
      contests.map((contest) => ({
        ...contest,
        liveTiming: getTiming(contest.startTime, contest.endTime, now),
        timerLabel: getTimerLabel(contest, now),
      })),
    [contests, now],
  );

  if (isLoading) {
    return <div className='text-center py-8'>Loading contests...</div>;
  }

  if (contests.length === 0) {
    return (
      <div className='text-center py-12 text-muted-foreground'>
        <Trophy className='w-12 h-12 mx-auto mb-4 opacity-50' />
        <p>No contests yet. An admin can create one from existing problems.</p>
      </div>
    );
  }

  return (
    <div className='grid gap-4 w-full'>
      {visibleContests.map((contest) => (
        <Card key={contest.id} className='hover:shadow-lg transition-shadow'>
          <CardHeader>
            <div className='flex justify-between items-start gap-4'>
              <div>
                <CardTitle className='text-lg mb-2'>{contest.title}</CardTitle>
                <Badge className={timingStyles[contest.liveTiming]}>
                  {contest.liveTiming}
                </Badge>
              </div>
              <Link href={`/contests/${contest.id}`}>
                <Button
                  size='sm'
                  variant={
                    contest.liveTiming === 'ACTIVE' && contest.isRegistered
                      ? 'default'
                      : 'outline'
                  }
                >
                  {contest.liveTiming === 'ACTIVE' && contest.isRegistered
                    ? 'Enter Contest'
                    : contest.isRegistered
                      ? 'View Details'
                      : 'Register'}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-3 line-clamp-2'>
              {contest.description}
            </p>
            <div className='flex flex-wrap gap-4 text-xs text-muted-foreground'>
              <span className='flex items-center gap-1'>
                <Calendar className='w-3 h-3' />
                {new Date(contest.startTime).toLocaleString()} —{' '}
                {new Date(contest.endTime).toLocaleString()}
              </span>
              <span>{contest.problemCount} problem(s)</span>
              <span className='flex items-center gap-1'>
                <Users className='w-3 h-3' />
                {contest.registrationCount} registered
              </span>
              <span className='flex items-center gap-1 font-medium text-foreground'>
                <Clock className='w-3 h-3' />
                {contest.timerLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
