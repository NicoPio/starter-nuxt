/**
 * GitHub OAuth route for nuxt-auth-utils
 */

import { getUserByOAuthProvider, createUserFromOAuth, updateOAuthTokens } from '../../utils/database/oauth'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user, tokens }) {
    try {
      // Check if user exists with this GitHub account
      let dbUser = await getUserByOAuthProvider('github', user.id.toString())

      if (!dbUser) {
        // Validate required fields
        if (!user.email) {
          throw new Error('GitHub account email is required')
        }

        // Create new user from GitHub account
        dbUser = await createUserFromOAuth({
          email: user.email,
          name: user.name || user.login || 'GitHub User',
          provider: 'github',
          provider_account_id: user.id.toString(),
          access_token: tokens.access_token,
          scope: tokens.scope,
        })
      } else {
        // Update OAuth tokens
        await updateOAuthTokens('github', user.id.toString(), {
          access_token: tokens.access_token,
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
      console.error('GitHub OAuth error:', error)
      return sendRedirect(event, '/login?error=oauth_failed')
    }
  },

  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  },
})
