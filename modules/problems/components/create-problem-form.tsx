'use client';

import { FormEvent, type ReactNode, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

type TestCase = { input: string; output: string };

const DEFAULT_STARTER_CODE = {
  CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {

    return 0;
}
`,
  JAVA: `import java.util.*;

public class Main {
    public static void main(String[] args) {

    }
}
`,
  PYTHON: `def main():
    pass

if __name__ == "__main__":
    main()
`,
  JAVASCRIPT: `const fs = require("fs");

function main() {

}

main();
`,
  C: `#include <stdio.h>

int main() {

    return 0;
}
`,
};

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const body = await response.text();
  const preview = body.replace(/\s+/g, ' ').slice(0, 120);
  throw new Error(
    `Server returned ${response.status} ${response.statusText || 'non-JSON response'}${preview ? `: ${preview}` : ''}`,
  );
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateProblemForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [constraints, setConstraints] = useState('');
  const [timeLimit, setTimeLimit] = useState('2');
  const [memoryLimit, setMemoryLimit] = useState('128000');
  const [publicTestCases, setPublicTestCases] = useState<TestCase[]>([
    { input: '', output: '' },
  ]);
  const [hiddenTestCases, setHiddenTestCases] = useState<TestCase[]>([
    { input: '', output: '' },
  ]);
  const [starterCode, setStarterCode] = useState<Record<string, string>>(
    DEFAULT_STARTER_CODE,
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const resolvedSlug = useMemo(() => slug || slugify(title), [slug, title]);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setDifficulty('');
    setConstraints('');
    setTimeLimit('2');
    setMemoryLimit('128000');
    setPublicTestCases([{ input: '', output: '' }]);
    setHiddenTestCases([{ input: '', output: '' }]);
    setStarterCode(DEFAULT_STARTER_CODE);
    setTags([]);
    setTagInput('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        title,
        slug: resolvedSlug,
        description,
        difficulty,
        tags,
        constraints,
        timeLimit: Number(timeLimit),
        memoryLimit: Number(memoryLimit),
        publicTestCases: cleanTestCases(publicTestCases),
        hiddenTestCases: cleanTestCases(hiddenTestCases),
        starterCode,
      };

      if (payload.publicTestCases.length === 0 && payload.hiddenTestCases.length === 0) {
        alert('Please add at least one public or hidden test case');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/create-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create problem');
      }

      alert(`Problem created successfully! ID: ${result.data.id}`);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create problem'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className='w-full max-w-5xl space-y-6 mt-8'>
      <div className='flex justify-end'>
        <Button type='button' onClick={resetForm} variant='outline'>
          <X className='w-4 h-4 mr-2' />
          Reset Form
        </Button>
      </div>

      <Tabs defaultValue='basic' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='basic'>Problem</TabsTrigger>
          <TabsTrigger value='tests'>Test Cases</TabsTrigger>
          <TabsTrigger value='starter'>Starter Code</TabsTrigger>
        </TabsList>

        <TabsContent value='basic' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Problem Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                <Field label='Title *'>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </Field>
                <Field label='Slug *'>
                  <Input
                    value={resolvedSlug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field label='Description *'>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder='Include statement, input format, and output format.'
                  required
                />
              </Field>

              <div className='grid gap-4 md:grid-cols-3'>
                <Field label='Difficulty *'>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select difficulty' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='EASY'>Easy</SelectItem>
                      <SelectItem value='MEDIUM'>Medium</SelectItem>
                      <SelectItem value='HARD'>Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label='Time Limit (seconds)'>
                  <Input
                    type='number'
                    min='0.1'
                    step='0.1'
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                  />
                </Field>
                <Field label='Memory Limit (KB)'>
                  <Input
                    type='number'
                    min='1024'
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(e.target.value)}
                  />
                </Field>
              </div>

              <Field label='Constraints'>
                <Textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  rows={4}
                  placeholder='1 <= n <= 2e5'
                />
              </Field>

              <Field label='Tags'>
                <div className='flex gap-2'>
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type='button' onClick={addTag} variant='outline'>
                    <Plus className='w-4 h-4' />
                  </Button>
                </div>
                <div className='flex flex-wrap gap-2 mt-2'>
                  {tags.map((tag) => (
                    <Badge key={tag} variant='secondary'>
                      {tag}
                      <button
                        type='button'
                        onClick={() => setTags(tags.filter((item) => item !== tag))}
                        className='ml-2'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </Badge>
                  ))}
                </div>
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='tests' className='space-y-4'>
          <TestCaseEditor
            title='Public Test Cases'
            testCases={publicTestCases}
            setTestCases={setPublicTestCases}
          />
          <TestCaseEditor
            title='Hidden Test Cases'
            testCases={hiddenTestCases}
            setTestCases={setHiddenTestCases}
          />
        </TabsContent>

        <TabsContent value='starter' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Full-Program Starter Code</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {Object.entries(starterCode).map(([language, value]) => (
                <Field key={language} label={language}>
                  <Textarea
                    value={value}
                    onChange={(e) =>
                      setStarterCode({ ...starterCode, [language]: e.target.value })
                    }
                    rows={8}
                    className='font-mono'
                  />
                </Field>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button type='submit' disabled={isLoading} className='w-full'>
        {isLoading ? 'Creating Problem...' : 'Create Problem'}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className='block text-sm font-medium space-y-1'>
      <span>{label}</span>
      {children}
    </label>
  );
}

function TestCaseEditor({
  title,
  testCases,
  setTestCases,
}: {
  title: string;
  testCases: TestCase[];
  setTestCases: (testCases: TestCase[]) => void;
}) {
  const update = (index: number, field: keyof TestCase, value: string) => {
    const next = [...testCases];
    next[index] = { ...next[index], [field]: value };
    setTestCases(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {testCases.map((testCase, index) => (
          <div key={index} className='border rounded-lg p-4 space-y-3'>
            <div className='flex items-center justify-between'>
              <span className='font-semibold'>Test Case {index + 1}</span>
              {testCases.length > 1 && (
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  onClick={() => setTestCases(testCases.filter((_, i) => i !== index))}
                >
                  <X className='w-4 h-4' />
                </Button>
              )}
            </div>
            <Field label='Input'>
              <Textarea
                value={testCase.input}
                onChange={(e) => update(index, 'input', e.target.value)}
                rows={4}
                className='font-mono'
              />
            </Field>
            <Field label='Output'>
              <Textarea
                value={testCase.output}
                onChange={(e) => update(index, 'output', e.target.value)}
                rows={4}
                className='font-mono'
              />
            </Field>
          </div>
        ))}
        <Button
          type='button'
          variant='outline'
          className='w-full'
          onClick={() => setTestCases([...testCases, { input: '', output: '' }])}
        >
          <Plus className='w-4 h-4 mr-2' />
          Add Test Case
        </Button>
      </CardContent>
    </Card>
  );
}

function cleanTestCases(testCases: TestCase[]) {
  return testCases.filter(
    (testCase) => testCase.input.trim() || testCase.output.trim(),
  );
}
