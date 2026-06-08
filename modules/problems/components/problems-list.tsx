'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit2, Trash2, Eye, Search } from 'lucide-react';
import Link from 'next/link';

interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  problemType: 'STDIN';
  tags: string[];
  isVisible?: boolean;
  createdAt: string;
}

export function ProblemsList() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch('/api/problems');
        if (response.ok) {
          const data = await response.json();
          setProblems(data.problems || []);
          setIsAdmin(Boolean(data.isAdmin));
        }
      } catch (error) {
        console.error('Failed to fetch problems:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblems();
  }, []);

  const filteredProblems = useMemo(() => {
    let filtered = problems;

    if (filterDifficulty !== 'ALL') {
      filtered = filtered.filter((p) => p.difficulty === filterDifficulty);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    return filtered;
  }, [problems, filterDifficulty, searchQuery]);

  const toggleVisibility = async (problemId: string, current: boolean) => {
    const response = await fetch(`/api/problems/${problemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVisible: !current }),
    });

    if (response.ok) {
      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, isVisible: !current } : p,
        ),
      );
    }
  };

  const deleteProblem = async (problemId: string, title: string) => {
    if (!confirm(`Delete "${title}" permanently?`)) return;

    const response = await fetch(`/api/problems/${problemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error || 'Failed to delete problem');
      return;
    }

    setProblems((prev) => prev.filter((problem) => problem.id !== problemId));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className='text-center py-8'>Loading problems...</div>;
  }

  return (
    <div className='w-full space-y-6'>
      <div className='relative'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Search problems by title, description, or tags...'
          className='pl-10'
        />
      </div>

      <div className='flex gap-4'>
        <div className='w-full md:max-w-xs'>
          <label className='block text-sm font-medium mb-2'>Difficulty</label>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ALL'>All Difficulties</SelectItem>
              <SelectItem value='EASY'>Easy</SelectItem>
              <SelectItem value='MEDIUM'>Medium</SelectItem>
              <SelectItem value='HARD'>Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredProblems.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          No problems found matching your filters
        </div>
      ) : (
        <div className='grid gap-4'>
          {filteredProblems.map((problem) => (
            <Card key={problem.id} className='hover:shadow-lg transition-shadow'>
              <CardHeader>
                <div className='flex justify-between items-start gap-4'>
                  <div className='flex-1'>
                    <CardTitle className='text-lg mb-2'>{problem.title}</CardTitle>
                    <div className='flex gap-2 flex-wrap'>
                      <Badge className={getDifficultyColor(problem.difficulty)}>
                        {problem.difficulty}
                      </Badge>
                      {isAdmin && (
                        <Badge variant={problem.isVisible ? 'default' : 'destructive'}>
                          {problem.isVisible ? 'Visible' : 'Hidden'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className='flex gap-2 items-center'>
                    {isAdmin && (
                      <div className='flex items-center gap-2 mr-2'>
                        <Switch
                          checked={Boolean(problem.isVisible)}
                          onCheckedChange={() =>
                            toggleVisibility(problem.id, Boolean(problem.isVisible))
                          }
                        />
                      </div>
                    )}
                    <Link href={`/problems/${problem.id}`}>
                      <Button variant='outline' size='sm'>
                        <Eye className='w-4 h-4' />
                      </Button>
                    </Link>
                    <Button variant='outline' size='sm'>
                      <Edit2 className='w-4 h-4' />
                    </Button>
                    {isAdmin && (
                      <Button
                        type='button'
                        variant='destructive'
                        size='sm'
                        onClick={() => deleteProblem(problem.id, problem.title)}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-600 mb-3'>
                  {problem.description.substring(0, 150)}...
                </p>
                <div className='flex gap-2 flex-wrap'>
                  {problem.tags.map((tag) => (
                    <Badge key={tag} variant='secondary'>
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className='text-xs text-gray-500 mt-3'>
                  Created: {new Date(problem.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className='text-sm text-gray-600'>
        Showing {filteredProblems.length} of {problems.length} problems
      </div>
    </div>
  );
}
