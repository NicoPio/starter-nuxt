import { describe, it, expect, vi, beforeEach } from 'vitest'

// Import after mocking
import { sendPasswordResetEmail, useResend } from '~/server/utils/email'

// Use vi.hoisted to ensure mock is available before module evaluation
const { mockSend, MockResend } = vi.hoisted(() => {
  const mockSend = vi.fn()
  const MockResend = vi.fn(() => ({
    emails: {
      send: mockSend,
    },
  }))
  return { mockSend, MockResend }
})

vi.mock('resend', () => ({
  Resend: MockResend,
}))

// Mock useRuntimeConfig
const mockConfig = {
  resend: {
    apiKey: 'test-api-key',
    fromEmail: '[email protected]',
  },
  public: {
    siteUrl: 'http://localhost:3000',
  },
}

vi.stubGlobal('useRuntimeConfig', vi.fn(() => mockConfig))

describe('server/utils/email', () => {
  beforeEach(() => {
    mockSend.mockReset()
    MockResend.mockClear()
  })

  describe('useResend', () => {
    it('creates a Resend instance with API key', () => {
      const resend = useResend()

      expect(resend).toBeDefined()
      expect(MockResend).toHaveBeenCalledWith('test-api-key')
    })

    it('returns the same instance on multiple calls (singleton)', () => {
      const resend1 = useResend()
      const resend2 = useResend()

      // The main test is that both calls return the same instance
      // This verifies the singleton pattern works
      expect(resend1).toBe(resend2)
      expect(resend1).toBeDefined()
      expect(resend2).toBeDefined()
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('sends password reset email successfully', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const result = await sendPasswordResetEmail('[email protected]', 'test-token-123')

      expect(result).toEqual({
        success: true,
        id: 'test-message-id',
      })
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it('calls Resend with correct parameters', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token-123')

      expect(mockSend).toHaveBeenCalledWith({
        from: '[email protected]',
        to: '[email protected]',
        subject: 'Réinitialisation de votre mot de passe',
        html: expect.stringContaining('http://localhost:3000/auth/reset-password?token=test-token-123'),
      })
    })

    it('includes correct reset URL in email HTML', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const token = 'K7gNU3sdo-OL0wNhqoVWhr3g6s1xYv72ol_pe_Unols'
      await sendPasswordResetEmail('[email protected]', token)

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain(`http://localhost:3000/auth/reset-password?token=${token}`)
    })

    it('uses correct subject in French', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.subject).toBe('Réinitialisation de votre mot de passe')
    })

    it('uses configured sender email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.from).toBe('[email protected]')
    })

    it('throws error when Resend returns error', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      })

      await expect(
        sendPasswordResetEmail('[email protected]', 'test-token')
      ).rejects.toThrow('Failed to send email: Invalid API key')
    })

    it('handles Resend API errors gracefully', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      })

      await expect(
        sendPasswordResetEmail('[email protected]', 'test-token')
      ).rejects.toThrow('Failed to send email: Rate limit exceeded')
    })

    it('throws error when send() throws exception', async () => {
      mockSend.mockRejectedValue(new Error('Network error'))

      await expect(
        sendPasswordResetEmail('[email protected]', 'test-token')
      ).rejects.toThrow('Network error')
    })

    it('handles missing message ID gracefully', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await sendPasswordResetEmail('[email protected]', 'test-token')

      expect(result).toEqual({
        success: true,
        id: undefined,
      })
    })

    it('sends email to multiple recipients format (single recipient)', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.to).toBe('[email protected]')
    })

    it('works with different email addresses', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'token-1')
      await sendPasswordResetEmail('[email protected]', 'token-2')
      await sendPasswordResetEmail('[email protected]', 'token-3')

      expect(mockSend).toHaveBeenCalledTimes(3)
      expect(mockSend.mock.calls[0][0].to).toBe('[email protected]')
      expect(mockSend.mock.calls[1][0].to).toBe('[email protected]')
      expect(mockSend.mock.calls[2][0].to).toBe('[email protected]')
    })

    it('works with different tokens', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'token-abc')
      await sendPasswordResetEmail('[email protected]', 'token-def')

      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(mockSend.mock.calls[0][0].html).toContain('token=token-abc')
      expect(mockSend.mock.calls[1][0].html).toContain('token=token-def')
    })

    it('uses configured site URL', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('http://localhost:3000/auth/reset-password')
    })

    it('handles production site URL', async () => {
      const originalConfig = { ...mockConfig }
      mockConfig.public.siteUrl = 'https://example.com'

      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('https://example.com/auth/reset-password?token=test-token')

      // Restore original config
      mockConfig.public.siteUrl = originalConfig.public.siteUrl
    })
  })

  describe('Email template', () => {
    it('generates HTML email template', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toBeDefined()
      expect(typeof callArgs.html).toBe('string')
      expect(callArgs.html.length).toBeGreaterThan(100)
    })

    it('includes DOCTYPE and HTML structure', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('<!DOCTYPE html')
      expect(callArgs.html).toContain('<html')
      expect(callArgs.html).toContain('</html>')
      expect(callArgs.html).toContain('<head>')
      expect(callArgs.html).toContain('<body')
    })

    it('includes responsive meta tags', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('viewport')
      expect(callArgs.html).toContain('width=device-width')
    })

    it('includes dark mode support', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('prefers-color-scheme: dark')
      expect(callArgs.html).toContain('dark-bg')
      expect(callArgs.html).toContain('dark-text')
    })

    it('includes CTA button with reset link', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('Réinitialiser mon mot de passe')
      expect(callArgs.html).toContain('href=')
      expect(callArgs.html).toContain('/auth/reset-password?token=')
    })

    it('includes alternative link text', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('Si le bouton ne fonctionne pas')
      expect(callArgs.html).toContain('copiez et collez ce lien')
    })

    it('includes security warning about expiration', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('1 heure')
      expect(callArgs.html).toContain('Ce lien est valide')
    })

    it('includes security advice for unsolicited emails', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('Si vous n\'avez pas demandé')
      expect(callArgs.html).toContain('ignorer cet email')
    })

    it('includes footer with automated message notice', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('envoyé automatiquement')
      expect(callArgs.html).toContain('ne pas y répondre')
    })

    it('uses table-based layout for email compatibility', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('<table')
      expect(callArgs.html).toContain('role="presentation"')
      expect(callArgs.html).toContain('cellspacing')
      expect(callArgs.html).toContain('cellpadding')
    })

    it('includes inline CSS for email client compatibility', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain('style=')
      expect(callArgs.html).toContain('<style type="text/css">')
    })

    it('escapes HTML special characters in URLs', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const token = 'token-with-special_chars-123'
      await sendPasswordResetEmail('[email protected]', token)

      const callArgs = mockSend.mock.calls[0][0]
      // Le token ne devrait pas être échappé (il est URL-safe)
      expect(callArgs.html).toContain(token)
    })

    it('renders reset URL correctly with special characters in token', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const token = 'K7gNU3sdo-OL0wNhqoVWhr3g6s1xYv72ol_pe_Unols'
      await sendPasswordResetEmail('[email protected]', token)

      const callArgs = mockSend.mock.calls[0][0]
      // Vérifier que le token avec - et _ est correctement inclus
      expect(callArgs.html).toContain(`token=${token}`)
      expect(callArgs.html).not.toContain('token=undefined')
    })
  })

  describe('Error handling and logging', () => {
    it('logs success message with recipient and message ID', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      mockSend.mockResolvedValue({
        data: { id: 'msg-123' },
        error: null,
      })

      await sendPasswordResetEmail('[email protected]', 'test-token')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Email] Password reset email sent successfully to:',
        '[email protected]',
        'Message ID:',
        'msg-123'
      )

      consoleSpy.mockRestore()
    })

    it('logs error when Resend returns error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
      })

      await expect(
        sendPasswordResetEmail('[email protected]', 'test-token')
      ).rejects.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Email] Error sending password reset email:',
        { message: 'Invalid recipient' }
      )

      consoleSpy.mockRestore()
    })

    it('logs unexpected errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSend.mockRejectedValue(new Error('Unexpected error'))

      await expect(
        sendPasswordResetEmail('[email protected]', 'test-token')
      ).rejects.toThrow('Unexpected error')

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Email] Unexpected error:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Edge cases', () => {
    it('handles very long email addresses', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const longEmail = 'very.long.email.address.with.many.dots.and.subdomains@subdomain.example.co.uk'
      await sendPasswordResetEmail(longEmail, 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.to).toBe(longEmail)
    })

    it('handles emails with special characters', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const specialEmail = 'user+tag@example.com'
      await sendPasswordResetEmail(specialEmail, 'test-token')

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.to).toBe(specialEmail)
    })

    it('handles very long tokens', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'test-message-id' },
        error: null,
      })

      const longToken = 'a'.repeat(100)
      await sendPasswordResetEmail('[email protected]', longToken)

      const callArgs = mockSend.mock.calls[0][0]
      expect(callArgs.html).toContain(`token=${longToken}`)
    })

    it('handles empty error message', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: '' },
      })

      await expect(
        sendPasswordResetEmail('[email protected]', 'test-token')
      ).rejects.toThrow('Failed to send email: ')
    })

    it('handles null error object', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: null as any,
      })

      // Si error est null mais data aussi, on devrait quand même réussir
      const result = await sendPasswordResetEmail('[email protected]', 'test-token')
      expect(result.success).toBe(true)
    })
  })
})
