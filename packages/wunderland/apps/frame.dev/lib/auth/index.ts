/**
 * Auth Module Exports
 *
 * Re-exports all auth-related components and hooks.
 *
 * @module lib/auth
 */

export {
  AuthProvider,
  useAuth,
  useGoogleRequired,
  type User,
  type AuthState,
  type AuthActions,
  type AuthContextValue,
} from './AuthContext'
