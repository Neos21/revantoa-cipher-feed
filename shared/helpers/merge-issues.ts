import type { ZodError } from 'zod';

/** Zod エラーを 1 文にする */
export const mergeIssues = (zodError: ZodError): string => zodError.issues.map(issue => issue.message).join('・');
