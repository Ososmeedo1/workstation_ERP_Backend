/**
 * CORS configuration.
 *
 * Allowed origins are configured with FRONTEND_URL (and optionally
 * FRONTEND_URLS / CORS_ORIGINS). Values may be comma-separated. Local
 * development origins are added automatically outside production.
 *
 * Wildcard entries are supported for subdomains, for example:
 *   https://*.example.com
 */

const { isProduction } = require('../Utils/environment.utils');

const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

const normalizeOrigin = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return null;
  }

  // Wildcard patterns cannot be parsed by URL, so validate them separately.
  if (trimmed.includes('*')) {
    const match = trimmed.match(/^(https?):\/\/([^/]+)$/i);
    if (!match) {
      return null;
    }

    const protocol = match[1].toLowerCase();
    const host = match[2].toLowerCase();

    // Only allow a wildcard as the complete left-most label.
    if (!/^(\*\.)?[a-z0-9.-]+(:\d+)?$/.test(host)) {
      return null;
    }

    return `${protocol}://${host}`;
  }

  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    if (url.username || url.password) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
};

const parseOriginList = (value) => {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
};

const wildcardToRegExp = (pattern) => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '[^./]+')}$`);
};

const createCorsOptions = () => {
  const configuredOrigins = [
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.FRONTEND_URLS),
    ...parseOriginList(process.env.CORS_ORIGINS)
  ];

  const allowedOrigins = new Set(
    isProduction()
      ? configuredOrigins
      : [...configuredOrigins, ...DEVELOPMENT_ORIGINS]
  );

  if (isProduction() && configuredOrigins.length === 0) {
    console.warn(
      '[CORS] No frontend origins configured. Set FRONTEND_URL to the deployed frontend origin.'
    );
  }

  const exactOrigins = new Set(
    [...allowedOrigins].filter((origin) => !origin.includes('*'))
  );
  const wildcardMatchers = [...allowedOrigins]
    .filter((origin) => origin.includes('*'))
    .map(wildcardToRegExp);

  const isOriginAllowed = (origin) => {
    // Requests without an Origin header (curl, server-to-server) are allowed.
    if (!origin) {
      return true;
    }

    const normalized = normalizeOrigin(origin);
    if (!normalized) {
      return false;
    }

    return (
      exactOrigins.has(normalized) ||
      wildcardMatchers.some((matcher) => matcher.test(normalized))
    );
  };

  return {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    maxAge: 86400
  };
};

module.exports = {
  createCorsOptions
};
