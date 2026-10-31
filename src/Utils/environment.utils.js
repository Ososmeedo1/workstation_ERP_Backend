/**
 * Environment helpers shared by the server and error middleware.
 *
 * Vercel does not always provide NODE_ENV=production, so VERCEL=1 is
 * treated as production as well. This prevents development error details
 * from leaking from deployed functions.
 */

const isProduction = () =>
  process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const isDevelopment = () =>
  process.env.NODE_ENV === 'development' && !isProduction();

module.exports = {
  isProduction,
  isDevelopment
};
