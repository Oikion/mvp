import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { RESEND_SEGMENTS, EMAIL_CONFIG } from '@/lib/resend-segments'
import WelcomeEmail from '@/emails/Welcome'

// Initialize Resend
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// HTML-escape to prevent injection in admin notification emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Allowed origins for CSRF protection
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://oikion.com',
  'https://www.oikion.com',
].filter(Boolean)

export async function POST(request: NextRequest) {
  try {
    // CSRF protection: verify request origin
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const requestOrigin = origin || (referer ? new URL(referer).origin : null)

    if (
      requestOrigin &&
      ALLOWED_ORIGINS.length > 0 &&
      !ALLOWED_ORIGINS.some(allowed => requestOrigin === allowed)
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, privacyAccepted, preAlphaInterest, locale } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!privacyAccepted) {
      return NextResponse.json(
        { error: 'Privacy policy acceptance is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const segmentId = preAlphaInterest
      ? RESEND_SEGMENTS.EARLY_ACCESS
      : RESEND_SEGMENTS.NEWSLETTER
    const isGreek = locale === 'el'

    // Log subscription without PII
    console.log('[Newsletter] New subscription:', {
      type: preAlphaInterest ? 'early_access' : 'newsletter',
      locale: locale || 'unknown',
      timestamp: new Date().toISOString(),
    })

    // Add contact to Resend segment
    if (resend) {
      try {
        // Create contact in Resend audience
        const { error: contactError } = await resend.contacts.create({
          email: normalizedEmail,
          audienceId: segmentId,
          unsubscribed: false,
          firstName: preAlphaInterest ? 'Early Access' : 'Newsletter',
        })

        let isNewContact = true

        if (contactError) {
          if (contactError.message?.includes('already exists')) {
            isNewContact = false
            // Update existing contact (resubscribe if needed)
            await resend.contacts.update({
              audienceId: segmentId,
              id: normalizedEmail,
              unsubscribed: false,
            })
          } else {
            console.error('[Newsletter] Error creating contact:', contactError.message)
          }
        }

        // Only send welcome email for NEW contacts (prevents duplicate emails)
        if (isNewContact) {
          try {
            const subject = preAlphaInterest
              ? (isGreek ? 'Καλώς ήρθατε στην Πρώιμη Πρόσβαση Oikion!' : 'Welcome to Oikion Early Access!')
              : (isGreek ? 'Καλώς ήρθατε στο Newsletter του Oikion!' : 'Welcome to the Oikion Newsletter!')

            await resend.emails.send({
              from: EMAIL_CONFIG.FROM,
              to: normalizedEmail,
              subject,
              react: WelcomeEmail({
                email: normalizedEmail,
                isEarlyAccess: preAlphaInterest,
              }),
            })
          } catch (emailError) {
            // Don't fail the subscription if welcome email fails
            console.error('[Newsletter] Error sending welcome email')
          }

          // Notify admin about new signup (HTML-escaped to prevent injection)
          try {
            const safeEmail = escapeHtml(normalizedEmail)
            await resend.emails.send({
              from: EMAIL_CONFIG.FROM,
              to: EMAIL_CONFIG.CONTACT_EMAIL,
              subject: `New ${preAlphaInterest ? 'Early Access' : 'Newsletter'} signup`,
              html: `<p>New signup received:</p>
<ul>
  <li><strong>Email:</strong> ${safeEmail}</li>
  <li><strong>Type:</strong> ${preAlphaInterest ? 'Early Access (Beta Waitlist)' : 'Newsletter'}</li>
  <li><strong>Time:</strong> ${new Date().toISOString()}</li>
</ul>`,
            });
          } catch (notifyError) {
            console.error('[Newsletter] Error sending admin notification');
          }
        }
      } catch (resendError) {
        console.error('[Newsletter] Resend API error')
        // Continue - don't fail subscription if Resend has issues
      }
    } else {
      console.warn('[Newsletter] Resend not configured - skipping segment assignment')
    }

    return NextResponse.json({
      message: preAlphaInterest
        ? 'Successfully registered for Early Access'
        : 'Successfully subscribed to newsletter',
      preAlpha: preAlphaInterest,
      success: true,
    })
  } catch (error) {
    console.error('[Newsletter] Subscription error')
    return NextResponse.json(
      { error: 'Failed to process subscription. Please try again.' },
      { status: 500 }
    )
  }
}
