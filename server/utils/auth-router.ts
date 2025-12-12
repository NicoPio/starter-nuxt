/**
 * Auth mode router utility for migration feature flag
 */

export type AuthMode = 'false' | 'dual' | 'true'

/**
 * Get current auth mode from environment
 * @returns Auth mode (false = Better Auth only, dual = both, true = nuxt-auth-utils only)
 */
export function getAuthMode(): AuthMode {
  const mode = process.env.USE_NUXT_AUTH_UTILS || 'dual'
  return mode as AuthMode
}

/**
 * Check if nuxt-auth-utils is enabled
 * @returns True if nuxt-auth-utils should be used
 */
export function isNuxtAuthEnabled(): boolean {
  const mode = getAuthMode()
  return mode === 'dual' || mode === 'true'
}

/**
 * Check if Better Auth is enabled
 * @returns True if Better Auth should be used
 */
export function isBetterAuthEnabled(): boolean {
  const mode = getAuthMode()
  return mode === 'dual' || mode === 'false'
}

/**
 * Check if in dual-auth mode (both systems active)
 * @returns True if in dual-auth mode
 */
export function isDualAuthMode(): boolean {
  return getAuthMode() === 'dual'
}
