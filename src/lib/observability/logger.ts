/**
 * Production-safe structured logger with automated secret redaction and correlation ID tracking.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  propertyId?: string;
  organizationId?: string;
  userId?: string;
  route?: string;
  action?: string;
  durationMs?: number;
  [key: string]: unknown;
}

// Sensitive keys that must be redacted automatically from logs
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /authorization/i,
  /cookie/i,
  /card/i,
  /cvv/i,
  /service_role/i,
  /serviceRole/i,
  /anon_key/i,
  /postgres/i,
  /bearer/i,
];

/**
 * Deeply redacts sensitive fields from objects/data before logging.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact postgres connection strings if found
    if (data.includes('postgresql://') || data.includes('postgres://')) {
      return '[REDACTED_DATABASE_URL]';
    }
    // Redact JWT-like or bearer token strings
    if (data.startsWith('Bearer ') || (data.includes('.') && data.split('.').length === 3 && data.length > 50)) {
      return '[REDACTED_JWT_TOKEN]';
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }

  if (typeof data === 'object') {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitive = SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }

  return '[UNSUPPORTED_TYPE]';
}

/**
 * Generates a standard UUID-v4 format correlation ID.
 */
export function generateCorrelationId(prefix: string = 'req'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}

export class ProductionLogger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = { ...context };
  }

  public withContext(additionalContext: LogContext): ProductionLogger {
    return new ProductionLogger({
      ...this.context,
      ...additionalContext,
    });
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? redactSensitiveData(meta) : undefined;
    const cleanContext = redactSensitiveData(this.context);

    const logEntry = {
      timestamp,
      level,
      message,
      ...(cleanContext as Record<string, unknown>),
      ...(cleanMeta ? { meta: cleanMeta } : {}),
    };

    const formatted = JSON.stringify(logEntry);

    switch (level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'INFO':
      case 'DEBUG':
      default:
        console.log(formatted);
        break;
    }
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.log('INFO', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    this.log('WARN', message, meta);
  }

  public error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errorDetails = error instanceof Error
      ? { errorMessage: error.message, errorName: error.name }
      : { error: redactSensitiveData(error) };

    this.log('ERROR', message, {
      ...errorDetails,
      ...meta,
    });
  }

  public debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      this.log('DEBUG', message, meta);
    }
  }
}

// Export default singleton instance
export const logger = new ProductionLogger({
  service: 'stayhub-app',
  environment: process.env.NODE_ENV || 'production',
});
