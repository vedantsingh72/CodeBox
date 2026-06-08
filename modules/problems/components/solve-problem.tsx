'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Send, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeEditor } from './code-editor';
import { calculateDynamicScore } from '@/lib/contest-scoring';

type ProblemDetail = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  examples: Array<{ input: string; output: string }>;
  publicTestCases: Array<{ input: string; output: string }>;
  constraints: string;
  hints?: string | null;
  starterCode: Record<string, string>;
};

type SolveProblemProps = {
  problem: ProblemDetail;
  contestId?: string;
  canAttempt?: boolean;
  alreadySolved?: boolean;
  contestEndTime?: string;
  contestProblem?: {
    basePoints: number;
    acceptedCount: number;
  } | null;
};

type RunResult = {
  status: string;
  message: string;
  passedTests?: number;
  failedTests?: number;
  totalTests?: number;
  scoreAwarded?: number;
  testCase?: {
    expectedOutput: string;
    actualOutput: string | null;
    error: string | null;
  };
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

const difficultyStyles: Record<string, string> = {
  EASY: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  HARD: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

function ProblemPanel({ problem, showHints }: { problem: ProblemDetail; showHints: boolean }) {
  return (
    <div className='h-full overflow-y-auto p-4 md:p-6 space-y-5'>
      <div>
        <div className='flex flex-wrap items-center gap-2 mb-3'>
          <Badge className={difficultyStyles[problem.difficulty] ?? ''}>
            {problem.difficulty}
          </Badge>
          {problem.tags.map((tag) => (
            <Badge key={tag} variant='secondary'>
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className='text-xl md:text-2xl font-bold'>{problem.title}</h1>
      </div>

      <div className='prose prose-sm dark:prose-invert max-w-none'>
        <p className='whitespace-pre-wrap text-sm leading-relaxed'>
          {problem.description}
        </p>
      </div>

      {problem.constraints && (
        <section>
          <h2 className='font-semibold mb-2'>Constraints</h2>
          <pre className='text-sm whitespace-pre-wrap bg-muted p-3 rounded-md'>
            {problem.constraints}
          </pre>
        </section>
      )}

      {Array.isArray(problem.examples) && problem.examples.length > 0 && (
        <section>
          <h2 className='font-semibold mb-2'>Examples</h2>
          <div className='space-y-3'>
            {problem.examples.map((ex, i) => (
              <div key={i} className='text-sm bg-muted p-3 rounded-md space-y-1'>
                <p>
                  <strong>Input:</strong> {ex.input}
                </p>
                <p>
                  <strong>Output:</strong> {ex.output}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(problem.publicTestCases) && problem.publicTestCases.length > 0 && (
        <section>
          <h2 className='font-semibold mb-2'>Sample Input / Output</h2>
          <div className='space-y-3'>
            {problem.publicTestCases.map((testCase, i) => (
              <div key={i} className='text-sm bg-muted p-3 rounded-md space-y-2'>
                <p className='font-medium'>Sample {i + 1}</p>
                <div>
                  <p className='text-xs font-medium text-muted-foreground mb-1'>
                    Sample Input
                  </p>
                  <pre className='whitespace-pre-wrap font-mono'>
                    {testCase.input}
                  </pre>
                </div>
                <div>
                  <p className='text-xs font-medium text-muted-foreground mb-1'>
                    Sample Output
                  </p>
                  <pre className='whitespace-pre-wrap font-mono'>
                    {testCase.output}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showHints && problem.hints && (
        <section className='rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4'>
          <div className='flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-300'>
            <Lightbulb className='w-4 h-4' />
            <h2 className='font-semibold'>Hint</h2>
          </div>
          <p className='text-sm whitespace-pre-wrap'>{problem.hints}</p>
        </section>
      )}
    </div>
  );
}

function EditorPanel({
  problem,
  contestId,
  canAttempt,
  alreadySolved,
  contestEndTime,
  contestProblem,
}: SolveProblemProps) {
  const snippets = problem.starterCode as Record<string, string>;
  const languages = Object.keys(snippets);
  const [language, setLanguage] = useState(languages[0] ?? 'JAVASCRIPT');
  const [code, setCode] = useState(snippets[languages[0]] ?? '');
  const [customInput, setCustomInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!contestEndTime) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [contestEndTime]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(snippets[lang] ?? '');
    setResult(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          sourceCode: code,
          customInput: customInput.trim() || undefined,
          contestId,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        setResult({ status: 'ERROR', message: data.error || 'Run failed' });
        return;
      }

      setResult({
        status: data.ok ? 'ACCEPTED' : 'FAILED',
        message: data.message,
        testCase: data.firstFailure,
      });
    } catch (error) {
      setResult({
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to run code',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (alreadySolved) {
      setResult({ status: 'ACCEPTED', message: 'Already completed' });
      return;
    }

    if (!canAttempt) {
      alert('Submissions are only allowed during active contests.');
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          sourceCode: code,
          contestId,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        setResult({
          status: 'ERROR',
          message: data.error || 'Submission failed',
        });
        return;
      }

      setResult({
        status: data.submission.verdict,
        message: data.message,
        passedTests: data.submission.passedTests,
        failedTests: data.submission.failedTests,
        totalTests: data.submission.totalTests,
        scoreAwarded: data.submission.scoreAwarded,
        testCase: data.firstFailure,
      });
    } catch (error) {
      setResult({
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to submit solution',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAccepted = result?.status === 'ACCEPTED';
  const currentScore = contestProblem
    ? calculateDynamicScore(contestProblem.basePoints, contestProblem.acceptedCount)
    : null;
  const remainingMs = contestEndTime
    ? Math.max(0, new Date(contestEndTime).getTime() - now.getTime())
    : 0;
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const remainingLabel =
    remainingSeconds >= 3600
      ? `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m`
      : `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`;

  return (
    <div className='flex h-full flex-col'>
      <div className='flex flex-wrap items-center gap-2 border-b p-3'>
        {contestProblem && (
          <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground mr-auto'>
            <Badge variant='secondary'>{currentScore} pts</Badge>
            <Badge variant='outline'>{contestProblem.acceptedCount} solve(s)</Badge>
            {contestEndTime && <Badge variant='outline'>{remainingLabel}</Badge>}
          </div>
        )}
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className='w-40'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant='outline'
          size='sm'
          onClick={handleRun}
          disabled={isRunning || isSubmitting}
        >
          <Play className='w-4 h-4 mr-1' />
          {isRunning ? 'Running...' : 'Run Code'}
        </Button>

        <Button
          size='sm'
          onClick={handleSubmit}
          disabled={isRunning || isSubmitting || !canAttempt || alreadySolved}
        >
          <Send className='w-4 h-4 mr-1' />
          {alreadySolved ? 'Completed' : isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>

      <div className='flex-1 min-h-[240px] p-3'>
        <div className='h-full min-h-[240px] overflow-hidden rounded-md border bg-background'>
          <CodeEditor language={language} value={code} onChange={setCode} />
        </div>
      </div>

      <div className='border-t p-3 space-y-3'>
        <div>
          <p className='text-sm font-medium mb-2'>Custom Input</p>
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder='Optional input for a quick run'
            className='font-mono text-sm'
          />
        </div>

        {result && (
          <div
            className={cn(
              'p-3 rounded-md flex gap-3 text-sm',
              isAccepted
                ? 'bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-200',
            )}
          >
            {isAccepted ? (
              <CheckCircle2 className='w-5 h-5 shrink-0' />
            ) : (
              <XCircle className='w-5 h-5 shrink-0' />
            )}
            <div className='space-y-1'>
              <p className='font-semibold'>{result.message}</p>
              {result.passedTests !== undefined && (
                <p>
                  Passed {result.passedTests} test cases
                  {result.failedTests !== undefined &&
                    `, failed ${result.failedTests}`}
                  {result.totalTests !== undefined &&
                    ` out of ${result.totalTests}`}
                </p>
              )}
              {result.scoreAwarded !== undefined && result.scoreAwarded > 0 && (
                <p>Score awarded: {result.scoreAwarded}</p>
              )}
              {result.testCase && (
                <>
                  {result.testCase.expectedOutput && (
                    <p>Expected: {result.testCase.expectedOutput}</p>
                  )}
                  <p>Got: {result.testCase.actualOutput ?? 'none'}</p>
                  {result.testCase.error && (
                    <pre className='text-xs mt-2 overflow-auto whitespace-pre-wrap'>
                      {result.testCase.error}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SolveProblem({
  problem,
  contestId,
  canAttempt = true,
  alreadySolved = false,
  contestEndTime,
  contestProblem,
}: SolveProblemProps) {
  const [showHints, setShowHints] = useState(false);

  return (
    <div className='w-full h-[calc(100vh-8rem)] min-h-[600px] border rounded-lg overflow-hidden bg-card'>
      {alreadySolved && contestId && (
        <div className='px-4 py-2 text-sm bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-200 border-b'>
          You have already completed this contest problem.
        </div>
      )}

      {!alreadySolved && !canAttempt && contestId && (
        <div className='px-4 py-2 text-sm bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-b'>
          This contest is not active. You can practice, but submissions are closed.
        </div>
      )}

      {/* Desktop split layout */}
      <div className='hidden lg:block h-full'>
        <ResizablePanelGroup orientation='horizontal'>
          <ResizablePanel defaultSize={55} minSize={35}>
            <EditorPanel
              key={problem.id}
              problem={problem}
              contestId={contestId}
              canAttempt={canAttempt}
              alreadySolved={alreadySolved}
              contestEndTime={contestEndTime}
              contestProblem={contestProblem}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className='flex flex-col h-full'>
              <div className='border-b px-4 py-2 flex justify-between items-center'>
                <span className='text-sm font-medium'>Problem</span>
                {problem.hints && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowHints((v) => !v)}
                  >
                    <Lightbulb className='w-4 h-4 mr-1' />
                    {showHints ? 'Hide Hint' : 'Show Hint'}
                  </Button>
                )}
              </div>
              <ProblemPanel problem={problem} showHints={showHints} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile / tablet stacked layout */}
      <div className='lg:hidden h-full'>
        <Tabs defaultValue='problem' className='h-full flex flex-col'>
          <TabsList className='mx-3 mt-3 grid grid-cols-2'>
            <TabsTrigger value='problem'>Problem</TabsTrigger>
            <TabsTrigger value='code'>Code</TabsTrigger>
          </TabsList>
          <TabsContent value='problem' className='flex-1 overflow-hidden mt-0'>
            <div className='h-[calc(100vh-14rem)]'>
              <div className='border-b px-4 py-2 flex justify-end'>
                {problem.hints && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setShowHints((v) => !v)}
                  >
                    <Lightbulb className='w-4 h-4 mr-1' />
                    {showHints ? 'Hide Hint' : 'Show Hint'}
                  </Button>
                )}
              </div>
              <ProblemPanel problem={problem} showHints={showHints} />
            </div>
          </TabsContent>
          <TabsContent value='code' className='flex-1 overflow-hidden mt-0'>
            <div className='h-[calc(100vh-14rem)]'>
              <EditorPanel
                key={problem.id}
                problem={problem}
                contestId={contestId}
                canAttempt={canAttempt}
                alreadySolved={alreadySolved}
                contestEndTime={contestEndTime}
                contestProblem={contestProblem}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
