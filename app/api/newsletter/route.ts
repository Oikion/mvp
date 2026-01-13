import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { RESEND_SEGMENTS, EMAIL_CONFIG } from '@/lib/resend-segments'
import WelcomeEmail from '@/emails/Welcome'

// Initialize Resend
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, privacyAccepted, preAlphaInterest } = body

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

    // Log the subscription
    console.log('[Newsletter] New subscription:', {
      email: normalizedEmail,
      preAlphaInterest,
      segmentId,
      timestamp: new Date().toISOString()
    })

    // Add contact to Resend segment
    if (resend) {
      try {
        // Create contact in Resend audience
        const { data: contactData, error: contactError } = await resend.contacts.create({
          email: normalizedEmail,
          audienceId: segmentId,
          unsubscribed: false,
          firstName: preAlphaInterest ? 'Early Access' : 'Newsletter',
        })

        if (contactError) {
          // Check if contact already exists (not a real error)
          if (!contactError.message?.includes('already exists')) {
            console.error('[Newsletter] Error creating contact:', contactError)
          } else {
            console.log('[Newsletter] Contact already exists, updating...')
            // Update existing contact
            await resend.contacts.update({
              audienceId: segmentId,
              id: normalizedEmail,
              unsubscribed: false,
            })
          }
        } else {
          console.log('[Newsletter] Contact created:', contactData)
        }

        // Send welcome email
        try {
          const emailResult = await resend.emails.send({
            from: EMAIL_CONFIG.FROM,
            to: normalizedEmail,
            subject: preAlphaInterest 
              ? 'Welcome to Oikion Early Access!' 
              : 'Welcome to the Oikion Newsletter!',
            react: WelcomeEmail({
              email: normalizedEmail,
              isEarlyAccess: preAlphaInterest,
            }),
          })

          console.log('[Newsletter] Welcome email sent:', emailResult)
        } catch (emailError) {
          // Don't fail the subscription if welcome email fails
          console.error('[Newsletter] Error sending welcome email:', emailError)
        }
      } catch (resendError) {
        console.error('[Newsletter] Resend API error:', resendError)
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
    console.error('[Newsletter] Subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to process subscription. Please try again.' },
      { status: 500 }
    )
  }
}
