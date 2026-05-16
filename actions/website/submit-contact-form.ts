'use server'

import { prismadb } from '@/lib/prisma'
import resendHelper from '@/lib/resend'
import { EMAIL_CONFIG } from '@/lib/resend-segments'
import { actionSuccess, actionError, type ActionResponse } from '@/lib/action-response'
import { trackEvent } from '@/lib/posthog'
import { z } from 'zod'

const ContactFormSchema = z.object({
  inquiryType: z.enum(['invest', 'partner', 'try', 'ask']),
  name: z.string().min(1).max(200),
  email: z.string().email().max(300),
  orgName: z.string().max(300).optional(),
  message: z.string().max(5000).optional(),
  locale: z.enum(['el', 'en']).default('el'),
  privacyConsent: z.literal(true, {
    error: () => ({ message: 'You must agree to the Privacy Policy' }),
  }),
})

export type ContactFormData = z.infer<typeof ContactFormSchema>

const INQUIRY_LABELS: Record<string, { en: string; el: string }> = {
  invest: { en: 'Investor Inquiry', el: 'Ενδιαφέρον Επένδυσης' },
  partner: { en: 'Partnership Inquiry', el: 'Ενδιαφέρον Συνεργασίας' },
  try: { en: 'Platform Trial', el: 'Δοκιμή Πλατφόρμας' },
  ask: { en: 'General Question', el: 'Γενική Ερώτηση' },
}

function buildAdminNotificationHtml(data: ContactFormData): string {
  const label = INQUIRY_LABELS[data.inquiryType]?.en ?? data.inquiryType
  return `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <h2 style="font-size: 20px; font-weight: 500; color: #262F27; margin-bottom: 24px;">
        New Contact Form Submission
      </h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #262F27;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9; font-weight: 500; width: 140px;">Type</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9;">${label}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9; font-weight: 500;">Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9;">${escapeHtml(data.name)}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9; font-weight: 500;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9;">
            <a href="mailto:${escapeHtml(data.email)}" style="color: #7B8C7C;">${escapeHtml(data.email)}</a>
          </td>
        </tr>
        ${data.orgName ? `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9; font-weight: 500;">Organisation</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9;">${escapeHtml(data.orgName)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9; font-weight: 500;">Locale</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E8E2D9;">${data.locale.toUpperCase()}</td>
        </tr>
      </table>
      ${data.message ? `
      <div style="margin-top: 20px; padding: 16px; background: #F2EFE9; border-radius: 8px;">
        <p style="font-size: 12px; font-weight: 500; color: #7B8C7C; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Message</p>
        <p style="font-size: 14px; color: #262F27; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(data.message)}</p>
      </div>
      ` : ''}
      <p style="font-size: 11px; color: #7B8C7C; margin-top: 24px;">
        Submitted at ${new Date().toISOString()} via oikion.com
      </p>
    </div>
  `
}

function buildUserConfirmationHtml(data: ContactFormData): string {
  const isGreek = data.locale === 'el'
  const label = INQUIRY_LABELS[data.inquiryType]?.[data.locale] ?? data.inquiryType

  const heading = isGreek
    ? `Γεια σου ${escapeHtml(data.name.split(' ')[0])},`
    : `Hi ${escapeHtml(data.name.split(' ')[0])},`

  const body = isGreek
    ? `Λάβαμε το μήνυμά σου (${label}). Κάποιος από την ομάδα μας θα επικοινωνήσει μαζί σου εντός 48 ωρών.`
    : `We received your message (${label}). Someone from our team will get back to you within 48 hours.`

  const closing = isGreek ? 'Ευχαριστούμε,' : 'Thank you,'

  return `
    <div style="font-family: Inter, system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 0;">
      <div style="margin-bottom: 32px;">
        <svg viewBox="0 0 97 25" width="80" height="20" fill="#262F27" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.30063 7.79945C12.8006 7.79945 16.4606 11.4595 16.4606 15.9595C16.4606 20.4595 12.8006 24.1195 8.30063 24.1195C3.80063 24.1195 0.140625 20.4595 0.140625 15.9595C0.140625 11.4595 3.80063 7.79945 8.30063 7.79945ZM8.30063 23.4895C11.3906 23.4895 13.9106 20.2195 13.9106 15.9595C13.9106 11.7295 11.3906 8.42945 8.30063 8.42945C5.21063 8.42945 2.69063 11.7295 2.69063 15.9595C2.69063 20.2195 5.21063 23.4895 8.30063 23.4895Z"/>
          <path d="M23.2719 6.50945H23.2119C22.9719 6.29945 21.5919 4.94945 21.5919 4.10945C21.5919 3.20945 22.3419 2.48945 23.2419 2.48945C24.1419 2.48945 24.8619 3.20945 24.8619 4.10945C24.8619 4.94945 23.5119 6.29945 23.2719 6.50945Z"/>
          <path d="M66.7206 7.79945C71.2206 7.79945 74.8806 11.4595 74.8806 15.9595C74.8806 20.4595 71.2206 24.1195 66.7206 24.1195C62.2206 24.1195 58.5606 20.4595 58.5606 15.9595C58.5606 11.4595 62.2206 7.79945 66.7206 7.79945Z"/>
        </svg>
      </div>
      <h2 style="font-size: 20px; font-weight: 400; color: #262F27; margin-bottom: 16px;">
        ${heading}
      </h2>
      <p style="font-size: 15px; color: #262F27; opacity: 0.7; line-height: 1.7; margin-bottom: 24px;">
        ${body}
      </p>
      <p style="font-size: 15px; color: #262F27; opacity: 0.7; line-height: 1.7;">
        ${closing}<br/>
        <span style="color: #7B8C7C;">The Oikion Team</span>
      </p>
      <hr style="border: none; border-top: 1px solid #E8E2D9; margin: 32px 0 16px;" />
      <p style="font-size: 11px; color: #7B8C7C;">
        oikion.com
      </p>
    </div>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function submitWebsiteContactForm(
  data: ContactFormData
): Promise<ActionResponse<{ id: string }>> {
  // Validate
  const parsed = ContactFormSchema.safeParse(data)
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? 'Invalid form data')
  }

  const { privacyConsent: _, ...formData } = parsed.data

  try {
    // 1. Store in database
    const submission = await prismadb.websiteContactSubmission.create({
      data: {
        inquiryType: formData.inquiryType,
        name: formData.name,
        email: formData.email,
        orgName: formData.orgName ?? null,
        message: formData.message ?? null,
        locale: formData.locale,
      },
    })

    // 2. Track server-side (fires regardless of cookie consent)
    trackEvent(`website_visitor_${submission.id}`, 'contact_form_server_submitted', {
      inquiry_type: formData.inquiryType,
      locale: formData.locale,
      has_message: !!formData.message,
      submission_id: submission.id,
    })

    // 3. Send emails (non-blocking, don't fail the submission if email fails)
    try {
      const resend = await resendHelper()

      const label = INQUIRY_LABELS[formData.inquiryType]?.en ?? formData.inquiryType

      // Notify admin
      await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: EMAIL_CONFIG.CONTACT_EMAIL,
        subject: `[Website] ${label} from ${formData.name}`,
        html: buildAdminNotificationHtml(parsed.data),
        replyTo: formData.email,
      })

      // Send confirmation to user
      const userSubject = formData.locale === 'el'
        ? 'Λάβαμε το μήνυμά σου · Oikion'
        : 'We received your message · Oikion'

      await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: formData.email,
        subject: userSubject,
        html: buildUserConfirmationHtml(parsed.data),
      })

      // Mark email sent
      await prismadb.websiteContactSubmission.update({
        where: { id: submission.id },
        data: { emailSentAt: new Date() },
      })
    } catch (emailErr) {
      console.error('[WEBSITE_CONTACT_EMAIL]', emailErr)
      // Submission is saved, email failure is not user-facing
    }

    return actionSuccess({ id: submission.id })
  } catch (err) {
    console.error('[WEBSITE_CONTACT_SUBMIT]', err)
    return actionError('Failed to submit form')
  }
}
