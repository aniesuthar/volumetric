import crypto from 'crypto'

/**
 * Generate a secure random token for team invitations
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create an invitation URL with the token
 */
export function createInvitationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/teams/accept-invitation?token=${token}`
}

/**
 * Validate that a token has the correct format
 */
export function isValidInvitationToken(token: string): boolean {
  // Token should be 64 characters (32 bytes in hex)
  return /^[a-f0-9]{64}$/i.test(token)
}