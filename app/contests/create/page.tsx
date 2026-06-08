import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { currentUserRole } from '@/modules/auth/actions';
import { CreateContestForm } from '@/modules/contests/components/create-contest-form';
import { UserRole } from '@prisma/client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CreateContestPage() {
  const role = await currentUserRole();

  if (role !== UserRole.ADMIN) {
    redirect('/contests');
  }

  return (
    <section className='flex flex-col items-center mx-4 my-4'>
      <div className='flex flex-row justify-between items-center w-full max-w-2xl mb-8'>
        <Link href='/contests'>
          <Button variant='outline' size='icon'>
            <ArrowLeft className='size-4' />
          </Button>
        </Link>
        <h1 className='text-2xl font-bold text-amber-400'>Create Contest</h1>
        <ModeToggle />
      </div>

      <CreateContestForm />
    </section>
  );
}
