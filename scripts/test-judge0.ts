/**
 * Quick Judge0 connectivity test.
 * Run: npx tsx scripts/test-judge0.ts
 */
import "dotenv/config";
import axios from "axios";

const BASE = process.env.JUDGE0_API_URL?.replace(/\/$/, "") ?? "";

const twoSumJs = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}

const fs = require("fs");
const input = fs.readFileSync(0, "utf-8").trim().split("\\n").filter(Boolean);
const args = input.map((line) => {
  try { return JSON.parse(line); } catch {
    const num = Number(line);
    return Number.isNaN(num) ? line : num;
  }
});
const result = twoSum(...args);
console.log(JSON.stringify(result));`;

const languageSmokeTests = [
  {
    name: "JavaScript",
    languageId: 63,
    sourceCode: 'console.log("hello from javascript")',
  },
  {
    name: "C",
    languageId: 50,
    sourceCode: '#include <stdio.h>\nint main(void) { printf("hello from c\\n"); return 0; }',
  },
  {
    name: "C++",
    languageId: 54,
    sourceCode: '#include <iostream>\nint main() { std::cout << "hello from cpp\\n"; return 0; }',
  },
];

async function testSingleSubmission() {
  console.log("\n--- Test 1: Single submission (wait=true) ---");
  let allOk = true;

  for (const test of languageSmokeTests) {
    const { data } = await axios.post(
      `${BASE}/submissions`,
      {
        source_code: test.sourceCode,
        language_id: test.languageId,
      },
      { params: { base64_encoded: false, wait: true } },
    );
    const ok = data.status?.id === 3;
    allOk &&= ok;
    console.log(`${test.name}:`, data.status?.description, JSON.stringify(data.stdout));
  }

  return allOk;
}

async function testBatchSubmission() {
  console.log("\n--- Test 2: Batch submission (used by CodeBox) ---");
  const { data } = await axios.post(
    `${BASE}/submissions/batch`,
    {
      submissions: [
        {
          source_code: twoSumJs,
          language_id: 63,
          stdin: "[2, 7, 11, 15]\n9",
        },
      ],
    },
    { params: { base64_encoded: false } },
  );

  const token = data[0]?.token ?? data.submissions?.[0]?.token;
  if (!token) {
    console.error("No token returned:", data);
    return false;
  }

  let result;
  for (let i = 0; i < 15; i++) {
    const poll = await axios.get(`${BASE}/submissions/${token}`, {
      params: { base64_encoded: false, fields: "*" },
    });
    result = poll.data;
    if (result.status?.id !== 1 && result.status?.id !== 2) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("Status:", result?.status?.description);
  console.log("Stdout:", JSON.stringify(result?.stdout?.trim()));
  console.log("Expected: [0,1]");
  return result?.stdout?.trim() === "[0,1]" && result?.status?.id === 3;
}

async function main() {
  console.log("JUDGE0_API_URL:", BASE || "(not set)");
  if (!BASE) {
    console.error("Set JUDGE0_API_URL in .env");
    process.exit(1);
  }

  try {
    const langs = await axios.get(`${BASE}/languages`);
    console.log(`Languages endpoint OK (${langs.data.length} languages)`);
  } catch (e) {
    console.error("Cannot reach Judge0:", e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const singleOk = await testSingleSubmission();
  const batchOk = await testBatchSubmission();

  console.log("\n=== Results ===");
  console.log("Single submission:", singleOk ? "PASS" : "FAIL");
  console.log("Batch submission:", batchOk ? "PASS" : "FAIL");

  process.exit(singleOk && batchOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
