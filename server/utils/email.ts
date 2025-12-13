import { Resend } from 'resend'
import type { H3Event } from 'h3'

let resendInstance: Resend | null = null

/**
 * Obtient une instance singleton de Resend
 */
export function useResend() {
  if (!resendInstance) {
    const config = useRuntimeConfig()
    resendInstance = new Resend(config.resend.apiKey)
  }
  return resendInstance
}

/**
 * Envoie un email de réinitialisation de mot de passe
 *
 * @param to - Adresse email du destinataire
 * @param resetToken - Token de réinitialisation (43 caractères Base64URL)
 * @returns Objet avec succès et ID du message
 */
export async function sendPasswordResetEmail(to: string, resetToken: string) {
  const config = useRuntimeConfig()
  const resend = useResend()

  const resetUrl = `${config.public.siteUrl}/auth/reset-password?token=${resetToken}`

  try {
    const { data, error } = await resend.emails.send({
      from: config.resend.fromEmail,
      to,
      subject: 'Réinitialisation de votre mot de passe',
      html: renderPasswordResetEmailTemplate(resetUrl),
    })

    if (error) {
      console.error('[Email] Error sending password reset email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('[Email] Password reset email sent successfully to:', to, 'Message ID:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Unexpected error:', error)
    throw error
  }
}

/**
 * Génère le template HTML pour l'email de réinitialisation
 *
 * @param resetUrl - URL complète du lien de réinitialisation
 * @returns HTML du template
 */
function renderPasswordResetEmailTemplate(resetUrl: string): string {
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Réinitialisation de mot de passe</title>

  <style type="text/css">
    /* Reset CSS */
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    table { border-collapse: collapse; }
    img { border: 0; max-width: 100%; }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding: 20px !important; }
      .button { padding: 14px 32px !important; font-size: 15px !important; }
    }

    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      .dark-bg { background-color: #1a1a1a !important; }
      .dark-text { color: #e5e5e5 !important; }
      .dark-card { background-color: #2d2d2d !important; }
      .dark-muted { color: #a0a0a0 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;" class="dark-bg">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;" class="dark-bg">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Container (600px) -->
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" class="dark-card">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px;" class="mobile-padding">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3;" class="dark-text">
                Réinitialisation de mot de passe
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 30px 40px;" class="mobile-padding">
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;" class="dark-text">
                Bonjour,
              </p>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;" class="dark-text">
                Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;" class="mobile-padding">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-radius: 6px; background-color: #3b82f6;">
                    <a href="${resetUrl}"
                       style="display: inline-block; padding: 16px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;"
                       class="button"
                       aria-label="Réinitialiser mon mot de passe">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alternative Link -->
          <tr>
            <td style="padding: 0 40px 30px 40px;" class="mobile-padding">
              <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;" class="dark-muted">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #3b82f6; word-break: break-all;">
                <a href="${resetUrl}" style="color: #3b82f6; text-decoration: underline;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 40px 30px 40px; border-top: 1px solid #e5e7eb;" class="mobile-padding">
              <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;" class="dark-muted">
                ⚠️ Ce lien est valide pendant <strong>1 heure</strong>. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px;" class="mobile-padding dark-card">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af;" class="dark-muted">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
