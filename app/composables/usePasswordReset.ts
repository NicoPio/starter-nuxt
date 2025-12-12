/**
 * Password Reset composable
 * Handles forgot password and reset password flows
 */

export const usePasswordReset = () => {
  const toast = useToast()
  const { t } = useContentI18n()

  /**
   * Request a password reset email
   * @param email - User email address
   * @returns Success/error response
   */
  const requestPasswordReset = async (email: string) => {
    try {
      const response = await $fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: {
          email,
        },
      })

      // Show success toast
      toast.add({
        title: t('auth.forgotPassword.success'),
        description: t('auth.forgotPassword.successMessage'),
        color: 'green',
        icon: 'i-heroicons-check-circle',
      })

      return { data: response, error: null }
    } catch (error: unknown) {
      console.error('Request password reset error:', error)

      // Show error toast
      let errorMessage = t('auth.forgotPassword.errorGeneric')

      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode

        if (statusCode === 429) {
          errorMessage = t('auth.forgotPassword.rateLimited')
        }
      }

      toast.add({
        title: t('auth.forgotPassword.error'),
        description: errorMessage,
        color: 'red',
        icon: 'i-heroicons-exclamation-circle',
      })

      return { data: null, error }
    }
  }

  /**
   * Verify a password reset token
   * @param token - Reset token from URL
   * @returns Token validation result
   */
  const verifyResetToken = async (token: string) => {
    try {
      const response = await $fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        body: {
          token,
        },
      })

      return { data: response, error: null }
    } catch (error: unknown) {
      console.error('Verify reset token error:', error)
      return { data: null, error }
    }
  }

  /**
   * Reset password with a valid token
   * @param token - Reset token from URL
   * @param password - New password
   * @param confirmPassword - Password confirmation
   * @returns Success/error response
   */
  const resetPassword = async (token: string, password: string, confirmPassword: string) => {
    try {
      const response = await $fetch('/api/auth/reset-password', {
        method: 'POST',
        body: {
          token,
          password,
          confirmPassword,
        },
      })

      // Show success toast
      toast.add({
        title: t('auth.resetPassword.success'),
        description: t('auth.resetPassword.successMessage'),
        color: 'green',
        icon: 'i-heroicons-check-circle',
      })

      return { data: response, error: null }
    } catch (error: unknown) {
      console.error('Reset password error:', error)

      // Show error toast
      let errorMessage = t('auth.resetPassword.errorGeneric')

      if (error && typeof error === 'object' && 'data' in error) {
        const errorData = (error as { data?: { reason?: string } }).data

        if (errorData?.reason === 'TOKEN_EXPIRED') {
          errorMessage = t('auth.resetPassword.expiredToken')
        } else if (errorData?.reason === 'TOKEN_USED') {
          errorMessage = t('auth.resetPassword.usedToken')
        } else if (errorData?.reason === 'TOKEN_INVALID' || errorData?.reason === 'TOKEN_NOT_FOUND') {
          errorMessage = t('auth.resetPassword.invalidToken')
        }
      }

      if (error && typeof error === 'object' && 'statusMessage' in error) {
        const statusMessage = (error as { statusMessage?: string }).statusMessage

        if (statusMessage === 'Password mismatch') {
          errorMessage = t('auth.resetPassword.passwordMismatch')
        } else if (statusMessage === 'Password too short') {
          errorMessage = t('auth.resetPassword.passwordTooShort')
        }
      }

      toast.add({
        title: t('auth.resetPassword.error'),
        description: errorMessage,
        color: 'red',
        icon: 'i-heroicons-exclamation-circle',
      })

      return { data: null, error }
    }
  }

  return {
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
  }
}
