export const SUPPORTED_LANGUAGES = ["CPP", "JAVA", "PYTHON", "JAVASCRIPT", "C"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export type ProblemKind = "STDIN";

export type TestCase = {
  id?: string;
  input: string;
  output: string;
  explanation?: string;
};

export type ProblemExample = {
  input: string;
  output: string;
  explanation?: string;
};

export type StarterCode = Partial<Record<SupportedLanguage, string>>;
export type ReferenceSolution = Partial<Record<SupportedLanguage, string>>;

export type ProblemCreateInput = {
  title: string;
  slug?: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  constraints: string;
  examples?: ProblemExample[];
  starterCode?: StarterCode;
  referenceSolution?: ReferenceSolution;
  publicTestCases: TestCase[];
  hiddenTestCases: TestCase[];
  timeLimit?: number;
  memoryLimit?: number;
  supportedLanguages?: SupportedLanguage[];
  isVisible?: boolean;
};

export type SubmissionEvaluationRequest = {
  problem: {
    id: string;
    publicTestCases: TestCase[];
    hiddenTestCases: TestCase[];
    timeLimit: number;
    memoryLimit: number;
    supportedLanguages: string[];
  };
  language: SupportedLanguage;
  sourceCode: string;
  contestMode?: boolean;
  customInput?: string;
};

export type TestCaseResult = {
  index: number;
  public: boolean;
  verdict:
    | "ACCEPTED"
    | "WRONG_ANSWER"
    | "COMPILATION_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "MEMORY_LIMIT_EXCEEDED"
    | "INTERNAL_ERROR";
  input?: string;
  expectedOutput?: string;
  actualOutput?: string | null;
  error?: string | null;
  runtime?: number | null;
  memory?: number | null;
};

export type EvaluationResult = {
  verdict: TestCaseResult["verdict"];
  passedTests: number;
  totalTests: number;
  runtime: number | null;
  memory: number | null;
  publicResults: TestCaseResult[];
  firstFailure?: TestCaseResult;
};
