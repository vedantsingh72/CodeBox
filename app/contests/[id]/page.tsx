import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { getContestLeaderboard } from '@/lib/contest-socket';
import { canAttemptContest, getContestTiming } from '@/lib/contest';
import { isAdminUser } from '@/lib/access';
import { ContestDetailClient } from '@/modules/contests/components/contest-detail-client';
import { getCurrentUserData } from '@/modules/auth/actions';
import { db } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await isAdminUser();
  const user = await getCurrentUserData();

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      problems: {
        include: {
          problem: {
            select: { id: true, title: true, difficulty: true, tags: true },
          },
        },
        orderBy: { order: 'asc' },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!contest) notFound();
  if (!admin && !contest.isVisible) notFound();

  const timing = getContestTiming(contest.contestStartTime, contest.contestEndTime);
  const canAttempt = canAttemptContest(contest.contestStartTime, contest.contestEndTime);

  let isRegistered = false;
  let solvedProblemIds: string[] = [];
  if (user && 'id' in user) {
    const registration = await db.contestRegistration.findUnique({
      where: {
        userId_contestId: {
          userId: user.id,
          contestId: id,
        },
      },
    });
    isRegistered = Boolean(registration);

    const solvedAttempts = await db.contestAttempt.findMany({
      where: {
        userId: user.id,
        contestId: id,
        solvedAt: { not: null },
      },
      select: { problemId: true },
    });
    solvedProblemIds = solvedAttempts.map((attempt) => attempt.problemId);
  }

  const leaderboardData = await getContestLeaderboard(id);
  const userRank =
    user && 'id' in user && leaderboardData
      ? leaderboardData.leaderboard.find((e) => e.userId === user.id) ?? null
      : null;

  return (
    <section className='flex flex-col items-center mx-4 my-4'>
      <div className='flex flex-row justify-between items-center w-full max-w-5xl mb-8'>
        <Link href='/contests'>
          <Button variant='outline' size='icon'>
            <ArrowLeft className='size-4' />
          </Button>
        </Link>
        <h1 className='text-xl font-bold text-primary'>GFGCodeBox Contest</h1>
        <ModeToggle />
      </div>

      <ContestDetailClient
        contestId={contest.id}
        title={contest.title}
        description={contest.description}
        startTime={contest.contestStartTime.toISOString()}
        endTime={contest.contestEndTime.toISOString()}
        timing={timing}
        canAttempt={canAttempt}
        isRegistered={isRegistered}
        isVisible={contest.isVisible}
        isAdmin={admin}
        registrationCount={contest._count.registrations}
        problems={contest.problems.map((cp: (typeof contest.problems)[number], index: number) => ({
          order: index,
          basePoints: cp.basePoints,
          acceptedCount: cp.acceptedCount,
          ...cp.problem,
        }))}
        initialLeaderboard={leaderboardData?.leaderboard ?? []}
        userRank={userRank}
        isSignedIn={Boolean(user && 'id' in user)}
        solvedProblemIds={solvedProblemIds}
      />
    </section>
  );
}
