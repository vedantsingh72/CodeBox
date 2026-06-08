import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { getCurrentUserData } from '@/modules/auth/actions';
import { ProblemsList } from '@/modules/problems/components/problems-list';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export const dynamic = 'force-dynamic';

export default async function ProblemsPage() {
  const user = await getCurrentUserData();

  return (
    <section className='flex flex-col items-center justify-start mx-4 my-4'>
      <div className='flex flex-row justify-between items-center w-full mb-8'>
        <Link href={'/'}>
          <Button variant={'outline'} size={'icon'}>
            <ArrowLeft className='size-4' />
          </Button>
        </Link>
        <h1 className='text-3xl font-bold text-primary'>GFGCodeBox Problems</h1>
        <div className='flex gap-4 items-center'>
          {user && 'role' in user && user.role === 'ADMIN' && (
            <Link href={'/create-problem'}>
              <Button>
                <Plus className='w-4 h-4 mr-2' />
                Create Problem
              </Button>
            </Link>
          )}
          <ModeToggle />
        </div>
      </div>

      <div className='w-full max-w-4xl'>
        <ProblemsList />
      </div>
    </section>
  );
}
