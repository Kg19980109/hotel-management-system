/**
 * Production-safe error handling and response utilities.
 * Maps internal database errors and exceptions to safe public user-facing error messages.
 */

import { logger, generateCorrelationId } from '@/lib/observability';

export interface SafeErrorResult {
  success: false;
  error: string;
  code: string;
  requestId: string;
}

export interface SafeSuccessResult<T> {
  success: true;
  data: T;
  requestId?: string;
}

export type SafeResult<T> = SafeSuccessResult<T> | SafeErrorResult;

// Public error codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Map of generic safe user messages
const USER_SAFE_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'Authentication is required to access this resource.',
  FORBIDDEN: 'You do not have permission to perform this operation.',
  NOT_FOUND: 'The requested resource was not found.',
  BAD_REQUEST: 'The request was invalid or malformed.',
  VALIDATION_ERROR: 'One or more fields failed validation.',
  CONFLICT: 'The operation could not be completed due to a conflict with existing data.',
  RATE_LIMITED: 'Too many requests. Please slow down and try again shortly.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
  SERVICE_UNAVAILABLE: 'The requested service is temporarily unavailable.',
};

/**
 * Categorizes and safely sanitizes an exception for user-facing responses.
 * Never leaks raw database error strings, SQL snippets, column names, or stack traces.
 */
export function sanitizeError(
  error: unknown,
  fallbackMessage?: string,
  context?: { action?: string; propertyId?: string; userId?: string }
): SafeErrorResult {
  const requestId = generateCorrelationId('err');
  
  // Extract error details safely
  const rawMessage = error instanceof Error ? error.message : String(error || '');
  let safeCode: ErrorCode = ErrorCodes.INTERNAL_ERROR;
  let safeMessage = fallbackMessage || USER_SAFE_MESSAGES[ErrorCodes.INTERNAL_ERROR];

  // Pattern match known safe domains
  if (/permission|forbidden|unauthorized|not authorized|rls|violates row-level security/i.test(rawMessage)) {
    safeCode = ErrorCodes.FORBIDDEN;
    safeMessage = 'You do not have permission to perform this action.';
  } else if (/not found|does not exist/i.test(rawMessage)) {
    safeCode = ErrorCodes.NOT_FOUND;
    safeMessage = 'The requested item was not found.';
  } else if (/duplicate|conflict|already exists|overlap|unique constraint/i.test(rawMessage)) {
    safeCode = ErrorCodes.CONFLICT;
    safeMessage = 'A conflicting record already exists.';
  } else if (/syntax error|syntax|sql|relation/i.test(rawMessage)) {
    safeCode = ErrorCodes.VALIDATION_ERROR;
    safeMessage = 'The submitted data was invalid.';
  } else if (/invalid|validation|required|must be/i.test(rawMessage)) {
    safeCode = ErrorCodes.VALIDATION_ERROR;
    // For validation errors, only pass through if it doesn't contain Postgres / SQL keywords
    if (!/select|insert|update|delete|table|column|relation|foreign key|syntax error/i.test(rawMessage)) {
      safeMessage = rawMessage;
    } else {
      safeMessage = 'The submitted data was invalid.';
    }
  } else if (/rate limit|too many requests/i.test(rawMessage)) {
    safeCode = ErrorCodes.RATE_LIMITED;
    safeMessage = USER_SAFE_MESSAGES[ErrorCodes.RATE_LIMITED];
  }

  // Log internal diagnostic information safely on the server side
  logger.error(`Operation failed: ${context?.action || 'unknown'}`, error, {
    requestId,
    safeCode,
    propertyId: context?.propertyId,
    userId: context?.userId,
  });

  return {
    success: false,
    error: safeMessage,
    code: safeCode,
    requestId,
  };
}
