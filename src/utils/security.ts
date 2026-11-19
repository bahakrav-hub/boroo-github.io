/**
 * Security Utilities Module
 */

import DOMPurify from 'dompurify';

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 1000;
const NAME_PATTERN = /^[a-zA-Zа-яА-ЯёЁ\s\-\.']+$/u;

const DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<form/i,
];

export function sanitizeName(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_NAME_LENGTH) return null;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  if (!NAME_PATTERN.test(trimmed)) return null;

  const clean = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });

  return clean.length > 0 ? clean : null;
}

export function sanitizeMessage(input: string): string | null {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return null;

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  const clean = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return clean.length > 0 ? clean : null;
}

// ============================================================================
// Rate Limiting
// ============================================================================
interface RateLimitState {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number;
}

const RATE_LIMIT_KEY = 'memorial_rate_limit';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const BLOCK_DURATION_MS = 300_000;

export function checkRateLimit(): { allowed: boolean; retryAfter?: number } {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { allowed: true };

    const state: RateLimitState = JSON.parse(raw);
    const now = Date.now();

    if (now > state.blockedUntil) {
      sessionStorage.removeItem(RATE_LIMIT_KEY);
      return { allowed: true };
    }

    if (now - state.firstAttempt < WINDOW_MS) {
      if (state.attempts >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
        return { allowed: false, retryAfter };
      }
      return { allowed: true };
    }

    sessionStorage.removeItem(RATE_LIMIT_KEY);
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

export function recordAttempt(): void {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();

    let state: RateLimitState;
    if (raw) {
      state = JSON.parse(raw);
      if (now - state.firstAttempt >= WINDOW_MS) {
        state = { attempts: 1, firstAttempt: now, blockedUntil: 0 };
      } else {
        state.attempts += 1;
      }
    } else {
      state = { attempts: 1, firstAttempt: now, blockedUntil: 0 };
    }

    if (state.attempts >= MAX_ATTEMPTS) {
      state.blockedUntil = now + BLOCK_DURATION_MS;
    }

    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getRemainingAttempts(): number {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return MAX_ATTEMPTS;

    const state: RateLimitState = JSON.parse(raw);
    const now = Date.now();

    if (now - state.firstAttempt >= WINDOW_MS || now > state.blockedUntil) {
      return MAX_ATTEMPTS;
    }

    return Math.max(0, MAX_ATTEMPTS - state.attempts);
  } catch {
    return MAX_ATTEMPTS;
  }
}

// ============================================================================
// Security Initializers
// ============================================================================
/**
 * Защита от Clickjacking.
 * ОТКЛЮЧЕНА по умолчанию, т.к. ломает работу в iframe-превью.
 * Включается вручную для production через серверный заголовок X-Frame-Options.
 */
export function initFrameBusting(): void {
  // Неактивно — защита обеспечивается серверным заголовком X-Frame-Options: DENY
  // В production настройте заголовок на уровне nginx/Apache/Cloudflare
  return;
}

export function initConsoleWarning(): void {
  if (typeof console === 'undefined') return;

  console.log(
    '%c⚠️ ВНИМАНИЕ!',
    'color: red; font-size: 40px; font-weight: bold;'
  );
  console.log(
    '%cЭта консоль предназначена для разработчиков.',
    'color: black; font-size: 16px;'
  );
}

// ============================================================================
// Form Validation
// ============================================================================
export function detectInjectionAttempt(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE)\b)/i,
    /(--|;|\/\*|\*\/|xp_)/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

export function validateMemoryForm(name: string, message: string): {
  valid: boolean;
  errors: string[];
  sanitizedName?: string;
  sanitizedMessage?: string;
} {
  const errors: string[] = [];

  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    errors.push(`Слишком много попыток. Подождите ${rateLimit.retryAfter} сек.`);
    return { valid: false, errors };
  }

  if (detectInjectionAttempt(name) || detectInjectionAttempt(message)) {
    errors.push('Обнаружена подозрительная активность.');
    return { valid: false, errors };
  }

  const sanitizedName = sanitizeName(name);
  if (!sanitizedName) {
    errors.push('Имя должно содержать только буквы, пробелы, дефис или точки (до 100 символов).');
  }

  const sanitizedMessage = sanitizeMessage(message);
  if (!sanitizedMessage) {
    errors.push('Сообщение не должно быть пустым и не должно содержать опасный код (до 1000 символов).');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitizedName: sanitizedName || undefined,
    sanitizedMessage: sanitizedMessage || undefined,
  };
}
