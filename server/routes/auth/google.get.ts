/**
 * Google OAuth route for nuxt-auth-utils
 */

import { getUserByOAuthProvider, createUserFromOAuth, updateOAuthTokens } from '../../utils/database/oauth'

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user, tokens }) {
    try {
      // Check if user exists with this Google account
      let dbUser = await getUserByOAuthProvider('google', user.sub)

      if (!dbUser) {
        // Create new user from Google account
        dbUser = await createUserFromOAuth({
          email: user.email,
          name: user.name || user.email.split('@')[0],
          provider: 'google',
          provider_account_id: user.sub,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          id_token: tokens.id_token,
          scope: tokens.scope,
        })
      } else {
        // Update OAuth tokens
        await updateOAuthTokens('google', user.sub, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        })
      }

      // Create nuxt-auth-utils session
      await setUserSession(event, {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          name: dbUser.name || undefined,
        },
        loggedInAt: Date.now(),
      })

      // Redirect to dashboard or callback URL
      const redirectTo = getQuery(event).redirect as string || '/dashboard'
      return sendRedirect(event, redirectTo)
    } catch (error: unknown) {
      console.error('Google OAuth error:', error)
      return sendRedirect(event, '/login?error=oauth_failed')
    }
  },

  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  },
})
