interface TeamInvitationEmailProps {
  inviteeName: string
  teamName: string
  inviterName: string
  inviterEmail: string
  role: string
  invitationUrl: string
}

export function getTeamInvitationEmailHtml({
  inviteeName,
  teamName,
  inviterName,
  inviterEmail,
  role,
  invitationUrl
}: TeamInvitationEmailProps): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
      </head>
      <body style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background-color: #fafafa; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">You're Invited!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.95; font-size: 16px;">Join ${teamName} team</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hi ${inviteeName || 'there'}!</h2>

            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1f2937;">
              <strong>${inviterName}</strong> (${inviterEmail}) has invited you to join the <strong>${teamName}</strong> team as a <strong>${role}</strong>.
            </p>

            <div style="background-color: #fafafa; border-left: 4px solid #ea580c; padding: 20px; margin: 30px 0; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 18px; font-weight: 600;">What does this mean?</h3>
              <p style="margin: 0; color: #6b7280;">
                ${getRoleDescription(role)}
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${invitationUrl}"
                 style="display: inline-block; background: #ea580c; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.3); transition: all 0.2s ease;">
                Accept Invitation
              </a>
            </div>

            <p style="margin: 30px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${invitationUrl}" style="color: #ea580c; word-break: break-all;">${invitationUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #1f2937; color: #f8fafc; padding: 30px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px;">
              This invitation was sent by ${inviterName} from ${teamName}
            </p>
            <p style="margin: 0; font-size: 12px; opacity: 0.8;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

function getRoleDescription(role: string): string {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'As an owner, you have full control over the team, including managing members, settings, and all team content.'
    case 'admin':
      return 'As an admin, you can manage team members, invite new people, and oversee team operations.'
    case 'member':
      return 'As a member, you can create, edit, and collaborate on team materials and projects.'
    case 'viewer':
      return 'As a viewer, you can view team materials and stay updated with team activities.'
    default:
      return 'You\'ll have access to team features based on your assigned role.'
  }
}

export function getTeamInvitationEmailText({
  inviteeName,
  teamName,
  inviterName,
  inviterEmail,
  role,
  invitationUrl
}: TeamInvitationEmailProps): string {
  return `
You're invited to join ${teamName}!

Hi ${inviteeName || 'there'},

${inviterName} (${inviterEmail}) has invited you to join the ${teamName} team as a ${role}.

${getRoleDescription(role)}

To accept this invitation, click the link below or copy and paste it into your browser:
${invitationUrl}

If you didn't expect this invitation, you can safely ignore this email.

---
This invitation was sent by ${inviterName} from ${teamName}
  `.trim()
}