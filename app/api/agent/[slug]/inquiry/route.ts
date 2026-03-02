import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/notification-service";
import sendEmail from "@/lib/sendmail";
import { PropertyInquiryAgentEmail } from "@/emails/notifications/PropertyInquiryAgentEmail";
import { PropertyInquiryConfirmEmail } from "@/emails/notifications/PropertyInquiryConfirmEmail";
import { render } from "@react-email/render";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const inquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  propertyType: z.string().min(1),
  location: z.string().min(2),
  budget: z.string().optional(),
  bedrooms: z.string().optional(),
  timeline: z.string().min(1),
  message: z.string().optional(),
  privacyConsent: z.boolean().refine((val) => val === true),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await props.params;
    const body = await req.json();

    // Validate input
    const validation = inquirySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Find the user by username (slug)
    const user = await prismadb.users.findFirst({
      where: {
        username: {
          equals: slug,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        userLanguage: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Get the agent profile
    const profile = await prismadb.agentProfile.findFirst({
      where: {
        userId: user.id,
        visibility: { in: ["PUBLIC", "SECURE"] },
      },
      select: {
        id: true,
        allowAnonymousInquiries: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Agent profile not found" },
        { status: 404 }
      );
    }

    // Check authentication requirement
    const { userId: clerkUserId } = await auth();
    if (!profile.allowAnonymousInquiries && !clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get inquirer's DB user ID if signed in
    let inquirerUserId: string | null = null;
    if (clerkUserId) {
      const inquirerDbUser = await prismadb.users.findFirst({
        where: { clerkUserId: clerkUserId },
        select: { id: true },
      });
      inquirerUserId = inquirerDbUser?.id || null;
    }

    // Create the inquiry
    const inquiry = await prismadb.propertyInquiry.create({
      data: {
        id: crypto.randomUUID(),
        agentProfileId: profile.id,
        inquirerUserId,
        inquirerName: data.name,
        inquirerEmail: data.email,
        inquirerPhone: data.phone || null,
        propertyType: data.propertyType,
        location: data.location,
        budget: data.budget || null,
        bedrooms: data.bedrooms || null,
        timeline: data.timeline,
        message: data.message || null,
        status: "NEW",
      },
    });

    // Create in-app notification for the agent
    await createNotification({
      userId: user.id,
      organizationId: "00000000-0000-0000-0000-000000000000",
      type: "CONTACT_FORM_SUBMISSION",
      title: user.userLanguage === "el" 
        ? "Νέο Αίτημα Ανάθεσης" 
        : "New Property Inquiry",
      message: data.name 
        ? (user.userLanguage === "el" 
            ? `Ο/Η ${data.name} υπέβαλε αίτημα ανάθεσης για ${data.propertyType} στην περιοχή ${data.location}.`
            : `${data.name} submitted a property inquiry for ${data.propertyType} in ${data.location}.`)
        : (user.userLanguage === "el"
            ? "Λάβατε νέο αίτημα ανάθεσης."
            : "You received a new property inquiry."),
      entityType: "CONTACT_SUBMISSION",
      entityId: inquiry.id,
      actorName: data.name || "Anonymous",
      metadata: {
        inquiryId: inquiry.id,
        propertyType: data.propertyType,
        location: data.location,
        budget: data.budget,
      },
    });

    // Send email notification to the agent
    if (user.email) {
      try {
        const emailHtml = await render(
          PropertyInquiryAgentEmail({
            agentName: user.name || "Agent",
            inquirerName: data.name,
            inquirerEmail: data.email,
            inquirerPhone: data.phone || "Not provided",
            propertyType: data.propertyType,
            location: data.location,
            budget: data.budget || "Not specified",
            bedrooms: data.bedrooms || "Not specified",
            timeline: data.timeline,
            message: data.message || "No additional message",
            inquiryId: inquiry.id,
            locale: user.userLanguage || "en",
          })
        );

        await sendEmail({
          from: process.env.EMAIL_FROM as string,
          to: user.email,
          subject: user.userLanguage === "el"
            ? `Νέο Αίτημα Ανάθεσης από ${data.name} - Oikion`
            : `New Property Inquiry from ${data.name} - Oikion`,
          text: `New property inquiry from ${data.name}.`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("[INQUIRY_API] Failed to send agent email:", emailError);
      }
    }

    // Send confirmation email to inquirer
    if (data.email) {
      try {
        const confirmEmailHtml = await render(
          PropertyInquiryConfirmEmail({
            inquirerName: data.name,
            agentName: user.name || "the agent",
            inquiryId: inquiry.id,
            locale: user.userLanguage || "en",
          })
        );

        await sendEmail({
          from: process.env.EMAIL_FROM as string,
          to: data.email,
          subject: user.userLanguage === "el"
            ? "Λάβαμε το αίτημά σας - Oikion"
            : "We received your inquiry - Oikion",
          text: "We received your inquiry.",
          html: confirmEmailHtml,
        });
      } catch (emailError) {
        console.error("[INQUIRY_API] Failed to send confirmation email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Inquiry submitted successfully",
    });
  } catch (error) {
    console.error("[INQUIRY_API] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
