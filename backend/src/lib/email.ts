import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { logger } from './logger'

const ses = new SESClient({ region: process.env.AWS_SES_REGION ?? 'us-east-1' })

const FROM = process.env.EMAIL_FROM ?? 'noreply@klockn.com'
const WEB_URL = process.env.WEB_APP_URL ?? 'https://app.klockn.com'

export async function sendInviteEmail(params: {
  to: string
  groupName: string
  inviteToken: string
}): Promise<void> {
  const inviteUrl = `${WEB_URL}/invite/${params.inviteToken}`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,0.08);overflow:hidden">
    <div style="background:linear-gradient(135deg,#7C3AED,#A78BFA);padding:32px;text-align:center">
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#fff;line-height:56px">K</div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">You're invited to ${params.groupName}</h1>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 8px;font-size:15px;color:#09090B;line-height:1.6">
        Someone added you to <strong>${params.groupName}</strong> on Klockn.
      </p>
      <p style="margin:0 0 28px;font-size:14px;color:#71717A;line-height:1.6">
        Connect your Google Calendar so the group can see when you're free.
        Your event titles and details are never shared — only free or busy.
      </p>
      <a href="${inviteUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#7C3AED,#9333EA);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:12px;box-shadow:0 4px 16px rgba(124,58,237,0.3)">
        Connect my calendar
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#A1A1AA;text-align:center">
        Or copy this link: <a href="${inviteUrl}" style="color:#7C3AED">${inviteUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`

  const text = `You've been invited to ${params.groupName} on Klockn.\n\nConnect your Google Calendar to share your availability:\n${inviteUrl}\n\nOnly free/busy is shared — your event details stay private.`

  const command = new SendEmailCommand({
    Source: `Klockn <${FROM}>`,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: `You're invited to ${params.groupName} on Klockn` },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text, Charset: 'UTF-8' },
      },
    },
  })

  await ses.send(command)
  logger.info('Invite email sent', { to: params.to, group: params.groupName })
}
