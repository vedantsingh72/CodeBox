'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type ProblemOption = {
  id: string;
  title: string;
  difficulty: string;
};

export function CreateContestForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [problems, setProblems] = useState<ProblemOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [problemPoints, setProblemPoints] = useState<Record<string, number>>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/problems')
      .then((r) => r.json())
      .then((d) => setProblems(d.problems || []))
      .catch(console.error);
  }, []);

  const toggleProblem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
    setProblemPoints((prev) => ({ ...prev, [id]: prev[id] ?? 100 }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          problemIds: selectedIds,
          problemPoints,
          isVisible,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to create contest');
        return;
      }

      router.push(`/contests/${data.contest.id}`);
    } catch {
      alert('Failed to create contest');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='w-full max-w-2xl space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Contest Details</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <Label htmlFor='title'>Title *</Label>
            <Input
              id='title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder='Weekly Challenge #1'
            />
          </div>
          <div>
            <Label htmlFor='description'>Description *</Label>
            <Textarea
              id='description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
            />
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='startTime'>Start Time *</Label>
              <Input
                id='startTime'
                type='datetime-local'
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor='endTime'>End Time *</Label>
              <Input
                id='endTime'
                type='datetime-local'
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className='flex items-center gap-3 pt-2'>
            <Switch
              id='contest-visible'
              checked={isVisible}
              onCheckedChange={setIsVisible}
            />
            <Label htmlFor='contest-visible'>
              Make contest visible to users immediately
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Problems *</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {problems.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              No problems in the database. Create a problem first or run{' '}
              <code className='text-xs'>npm run db:seed</code>.
            </p>
          ) : (
            problems.map((p) => (
              <div
                key={p.id}
                className='flex flex-col gap-3 p-3 border rounded-md sm:flex-row sm:items-center'
              >
                <label className='flex flex-1 items-center gap-3 cursor-pointer'>
                  <Checkbox
                    checked={selectedIds.includes(p.id)}
                    onCheckedChange={() => toggleProblem(p.id)}
                  />
                  <span className='flex-1 font-medium'>{p.title}</span>
                  <span className='text-xs text-muted-foreground'>{p.difficulty}</span>
                </label>
                <div className='flex items-center gap-2'>
                  <Label htmlFor={`points-${p.id}`} className='text-xs'>
                    Points
                  </Label>
                  <Input
                    id={`points-${p.id}`}
                    type='number'
                    min={100}
                    max={1000}
                    step={50}
                    className='w-24'
                    value={problemPoints[p.id] ?? 100}
                    disabled={!selectedIds.includes(p.id)}
                    onChange={(e) =>
                      setProblemPoints((prev) => ({
                        ...prev,
                        [p.id]: Math.min(
                          1000,
                          Math.max(100, Number(e.target.value) || 100),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button
        type='submit'
        disabled={isLoading || selectedIds.length === 0}
        className='w-full'
      >
        {isLoading ? 'Creating...' : 'Create Contest'}
      </Button>
    </form>
  );
}
