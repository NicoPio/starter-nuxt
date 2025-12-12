/**
 * Apple OAuth route for nuxt-auth-utils
 */

import { getUserByOAuthProvider, createUserFromOAuth, updateOAuthTokens } from '../../utils/database/oauth'

export default defineOAuthAppleEventHandler({
  async onSuccess(event, { user, tokens }) {
    try {
      // Get the Apple user ID (sub claim from ID token)
      const appleUserId = (user as { sub?: string; email?: string }).sub || user.email || ''

      if (!appleUserId) {
        throw new Error('Apple user ID (sub) is required')
      }

      // Check if user exists with this Apple account
      let dbUser = await getUserByOAuthProvider('apple', appleUserId)

      if (!dbUser) {
        // Apple doesn't always provide email/name on subsequent logins
        // Use the user object from first authentication
        const email = user.email || `${appleUserId}@appleid.private`
        const name = user.name?.firstName
          ? `${user.name.firstName} ${user.name.lastName || ''}`.trim()
          : email.split('@')[0]

        // Create new user from Apple account
        dbUser = await createUserFromOAuth({
          email,
          name,
          provider: 'apple',
          provider_account_id: appleUserId,
          access_token: tokens.access_token,
          id_token: tokens.id_token,
        })
      } else {
        // Update OAuth tokens
        await updateOAuthTokens('apple', appleUserId, {
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
      console.error('Apple OAuth error:', error)
      return sendRedirect(event, '/login?error=oauth_failed')
    }
  },

  onError(event, error) {
    console.error('Apple OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  },
})
