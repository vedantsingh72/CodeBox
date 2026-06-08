import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { getCurrentUserData } from '@/modules/auth/actions';
import { ContestsList } from '@/modules/contests/components/contests-list';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ContestsPage() {
  const user = await getCurrentUserData();

  return (
    <section className='flex flex-col items-center justify-start mx-4 my-4'>
      <div className='flex flex-row justify-between items-center w-full max-w-4xl mb-8'>
        <Link href='/'>
          <Button variant='outline' size='icon'>
            <ArrowLeft className='size-4' />
          </Button>
        </Link>
        <h1 className='text-3xl font-bold text-primary'>GFGCodeBox Contests</h1>
        <div className='flex gap-4 items-center'>
          {user?.role === 'ADMIN' && (
            <Link href='/contests/create'>
              <Button>
                <Plus className='w-4 h-4 mr-2' />
                Create Contest
              </Button>
            </Link>
          )}
          <ModeToggle />
        </div>
      </div>

      <div className='w-full max-w-4xl'>
        <ContestsList />
      </div>
    </section>
  );
}
