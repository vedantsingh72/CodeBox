import {
  SUPPORTED_LANGUAGES,
  type StarterCode,
  type SupportedLanguage,
} from "@/lib/platform-types";

export const FULL_PROGRAM_STARTER_CODE: Record<SupportedLanguage, string> = {
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

export function normalizeLanguage(language: string): SupportedLanguage {
  const normalized = language.toUpperCase();
  if (normalized === "C++") return "CPP";
  if (SUPPORTED_LANGUAGES.includes(normalized as SupportedLanguage)) {
    return normalized as SupportedLanguage;
  }
  throw new Error(`Unsupported language: ${language}`);
}

export function createSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildStarterCode(overrides: StarterCode = {}): StarterCode {
  return Object.fromEntries(
    SUPPORTED_LANGUAGES.map((language) => [
      language,
      overrides[language]?.trim()
        ? overrides[language]
        : FULL_PROGRAM_STARTER_CODE[language],
    ]),
  ) as StarterCode;
}

export function getStarterForLanguage(
  starterCode: StarterCode | null | undefined,
  language: string,
) {
  const lang = normalizeLanguage(language);
  return starterCode?.[lang] ?? FULL_PROGRAM_STARTER_CODE[lang];
}
