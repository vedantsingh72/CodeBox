import axios from "axios";
import { type SubmissionStatus } from "@prisma/client";

const JUDGE0_PARAMS = { base64_encoded: "true" };

export type Judge0SubmissionPayload = {
  source_code: string;
  language_id: number;
  stdin?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
};

export type Judge0ExecutionResult = {
  token?: string;
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status: {
    id: number;
    description?: string;
  };
};

export function getJudge0languageId(language: string) {
  const languageMap = {
    PYTHON: 71,
    JAVASCRIPT: 63,
    JAVA: 62,
    C: 50,
    CPP: 54,
    "C++": 54,
  };

  return languageMap[language.toUpperCase() as keyof typeof languageMap];
}

export function normalizeOutput(output: string | null | undefined): string {
  return (output ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

export function mapJudge0Status(statusId: number): SubmissionStatus {
  if (statusId === 3) return "ACCEPTED";
  if (statusId === 4) return "WRONG_ANSWER";
  if (statusId === 5) return "TIME_LIMIT_EXCEEDED";
  if (statusId === 6) return "COMPILATION_ERROR";
  if (statusId === 7 || statusId === 8 || statusId === 11 || statusId === 12) {
    return "RUNTIME_ERROR";
  }
  if (statusId === 9 || statusId === 10) return "MEMORY_LIMIT_EXCEEDED";
  return "INTERNAL_ERROR";
}

export function decodeJudge0Result(result: Judge0ExecutionResult) {
  const decode = (value: string | null | undefined) =>
    value ? Buffer.from(value, "base64").toString("utf-8") : value;

  return {
    ...result,
    stdout: decode(result.stdout),
    stderr: decode(result.stderr),
    compile_output: decode(result.compile_output),
    message: decode(result.message),
  };
}

export async function runJudge0Batch(payloads: Judge0SubmissionPayload[]) {
  assertJudge0Configured();

  const encodedPayloads = payloads.map(encodeSubmission);
  const created = await submitBatch(encodedPayloads);
  const createdSubmissions = Array.isArray(created) ? created : created.submissions;
  const tokens = createdSubmissions.map((submission: { token: string }) => submission.token);

  return pollBatchResults(tokens);
}

function assertJudge0Configured() {
  if (!process.env.JUDGE0_API_URL?.trim()) {
    throw new Error("JUDGE0_API_URL is not configured.");
  }
}

function encodeSubmission(submission: Judge0SubmissionPayload) {
  const encoded: Record<string, unknown> = { ...submission };
  for (const key of ["source_code", "stdin"] as const) {
    const value = encoded[key];
    if (typeof value === "string") {
      encoded[key] = Buffer.from(value, "utf-8").toString("base64");
    }
  }
  return encoded;
}

function getJudge0Headers(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (process.env.JUDGE0_API_KEY) {
    headers["x-rapidapi-key"] = process.env.JUDGE0_API_KEY;
  }
  if (process.env.JUDGE0_API_HOST) {
    headers["x-rapidapi-host"] = process.env.JUDGE0_API_HOST;
  }

  return headers;
}

async function submitBatch(submissions: Array<Record<string, unknown>>) {
  try {
    const { data } = await axios.request({
      method: "POST",
      url: `${process.env.JUDGE0_API_URL}/submissions/batch`,
      params: JUDGE0_PARAMS,
      headers: getJudge0Headers(),
      data: { submissions },
    });

    return data;
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 400) {
      throw error;
    }

    const created = [];
    for (const submission of submissions) {
      const { data } = await axios.request({
        method: "POST",
        url: `${process.env.JUDGE0_API_URL}/submissions`,
        params: JUDGE0_PARAMS,
        headers: getJudge0Headers(),
        data: submission,
      });
      created.push(data);
    }

    return created;
  }
}

async function pollBatchResults(tokens: string[]) {
  while (true) {
    try {
      const { data } = await axios.request({
        method: "GET",
        url: `${process.env.JUDGE0_API_URL}/submissions/batch`,
        params: {
          tokens: tokens.join(","),
          ...JUDGE0_PARAMS,
          fields: "token,stdout,stderr,compile_output,message,status,time,memory",
        },
        headers: getJudge0Headers(),
      });

      const results = data.submissions as Judge0ExecutionResult[];
      if (results.every((result) => result.status.id !== 1 && result.status.id !== 2)) {
        return results.map(decodeJudge0Result);
      }
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 400) {
        throw error;
      }

      return Promise.all(tokens.map((token) => pollSubmissionResult(token)));
    }

    await sleep(1000);
  }
}

async function pollSubmissionResult(token: string) {
  while (true) {
    const { data } = await axios.request({
      method: "GET",
      url: `${process.env.JUDGE0_API_URL}/submissions/${token}`,
      params: {
        ...JUDGE0_PARAMS,
        fields: "token,stdout,stderr,compile_output,message,status,time,memory",
      },
      headers: getJudge0Headers(),
    });

    if (data.status.id !== 1 && data.status.id !== 2) {
      return decodeJudge0Result(data);
    }

    await sleep(1000);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
