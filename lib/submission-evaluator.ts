import {
  getJudge0languageId,
  mapJudge0Status,
  normalizeOutput,
  runJudge0Batch,
} from "@/lib/judge0";
import {
  type EvaluationResult,
  type SubmissionEvaluationRequest,
  type TestCaseResult,
} from "@/lib/platform-types";

export async function evaluateSubmission(
  request: SubmissionEvaluationRequest,
): Promise<EvaluationResult> {
  if (!request.problem.supportedLanguages.includes(request.language)) {
    return emptyFailure("COMPILATION_ERROR", `Language ${request.language} is not supported.`);
  }

  const languageId = getJudge0languageId(request.language);
  if (!languageId) {
    return emptyFailure("COMPILATION_ERROR", `No Judge0 language id for ${request.language}.`);
  }

  const tests = request.customInput
    ? [{ input: request.customInput, output: "" }]
    : [...request.problem.publicTestCases, ...request.problem.hiddenTestCases];

  if (tests.length === 0) {
    return emptyFailure("INTERNAL_ERROR", "Problem has no test cases.");
  }

  const publicCount = request.problem.publicTestCases.length;
  const executions = await runJudge0Batch(
    tests.map((test) => ({
      source_code: request.sourceCode,
      language_id: languageId,
      stdin: test.input,
      cpu_time_limit: request.problem.timeLimit,
      memory_limit: request.problem.memoryLimit,
    })),
  );

  const results = executions.map((execution, index) => {
    const judgeVerdict = mapJudge0Status(execution.status.id) as TestCaseResult["verdict"];
    const expected = tests[index].output;
    const actualNormalized = normalizeOutput(execution.stdout);
    const expectedNormalized = normalizeOutput(expected);
    const executionAccepted = judgeVerdict === "ACCEPTED";
    const hasExpected = expected.trim().length > 0;

    const verdict: TestCaseResult["verdict"] =
      executionAccepted && (!hasExpected || actualNormalized === expectedNormalized)
        ? "ACCEPTED"
        : executionAccepted
          ? "WRONG_ANSWER"
          : judgeVerdict;

    return {
      index,
      public: index < publicCount,
      verdict,
      input: index < publicCount && !request.contestMode ? tests[index].input : undefined,
      expectedOutput:
        index < publicCount && !request.contestMode ? tests[index].output : undefined,
      actualOutput: index < publicCount && !request.contestMode ? execution.stdout ?? null : undefined,
      error: buildExecutionError(execution),
      runtime: execution.time ? Number(execution.time) : null,
      memory: execution.memory ?? null,
    } satisfies TestCaseResult;
  });

  const firstFailure = results.find((result) => result.verdict !== "ACCEPTED");
  const passedTests = results.filter((result) => result.verdict === "ACCEPTED").length;
  const publicResults = request.contestMode
    ? []
    : results.filter((result) => result.public);
  const runtimeValues = results
    .map((result) => result.runtime)
    .filter((value): value is number => typeof value === "number");
  const memoryValues = results
    .map((result) => result.memory)
    .filter((value): value is number => typeof value === "number");

  return {
    verdict: firstFailure?.verdict ?? "ACCEPTED",
    passedTests,
    totalTests: tests.length,
    runtime: runtimeValues.length ? Math.max(...runtimeValues) : null,
    memory: memoryValues.length ? Math.max(...memoryValues) : null,
    publicResults,
    firstFailure:
      firstFailure && firstFailure.public && !request.contestMode
        ? firstFailure
        : undefined,
  };
}

function emptyFailure(verdict: TestCaseResult["verdict"], message: string): EvaluationResult {
  return {
    verdict,
    passedTests: 0,
    totalTests: 0,
    runtime: null,
    memory: null,
    publicResults: [],
    firstFailure: {
      index: 0,
      public: true,
      verdict,
      error: message,
    },
  };
}

function buildExecutionError(execution: {
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { description?: string };
}) {
  return (
    execution.stderr ||
    execution.compile_output ||
    execution.message ||
    execution.status?.description ||
    null
  );
}
