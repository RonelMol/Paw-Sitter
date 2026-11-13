export type OwaspCategory =
  | "A01_BROKEN_ACCESS_CONTROL"
  | "A02_CRYPTOGRAPHIC_FAILURES"
  | "A03_INJECTION"
  | "A04_INSECURE_DESIGN"
  | "A05_SECURITY_MISCONFIGURATION"
  | "A06_VULNERABLE_COMPONENTS"
  | "A07_AUTH_FAILURES"
  | "A08_DATA_INTEGRITY"
  | "A09_LOGGING_MONITORING"
  | "A10_SSRF_API_ABUSE";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type TestStatus = "PASSED" | "FAILED" | "WARNING";

export interface OwaspTestResult {
  id: string;
  code: string;
  category: OwaspCategory;
  categoryTitle: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  status: TestStatus;
  targetEndpoint: string;
  targetFile?: string;
  evidence: string;
  recommendation: string;
  remediationPrompt: string;
  codePatchSnippet?: string;
  cwe: string;
  cvssScore: number;
  testDurationMs?: number;
  simulatedPayload?: string;
}

export interface OwaspCategorySummary {
  category: OwaspCategory;
  title: string;
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  score: number;
  status: "SECURE" | "NEEDS_ATTENTION" | "CRITICAL_ACTION";
}

export interface OwaspAuditReport {
  id?: number;
  scanType: string;
  overallScore: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  riskLevel: "CLEAN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  durationMs: number;
  testResults: OwaspTestResult[];
  categorySummaries: OwaspCategorySummary[];
  remediationPrompts: {
    testCode: string;
    title: string;
    category: string;
    severity: SeverityLevel;
    prompt: string;
    codePatch?: string;
  }[];
  triggeredBy: string;
  createdAt: string;
}

export const OwaspTestResult = {};
export const OwaspCategorySummary = {};
export const OwaspAuditReport = {};
