import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications/notification-service";
import { SYSTEM_ORG_ID } from "@/lib/sharing/constants";
import { encryptAgentContactForOrg } from "@/lib/model-encryption";
import sendEmail from "@/lib/sendmail";
import AgentContactFormSubmission from "@/emails/notifications/AgentContactFormSubmission";
import { render } from "@react-email/render";

export async function POST(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await props.params;
    const body = await req.json();

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
        clerkUserId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    // Resolve the agent's primary (non-personal) organization from Clerk
    let organizationId: string | null = null;
    if (user.clerkUserId) {
      try {
        const clerk = await clerkClient();
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId: user.clerkUserId,
        });
        const primaryOrg = memberships.data.find(
          (m) => (m.organization.publicMetadata as Record<string, unknown>)?.type !== "personal"
        );
        organizationId = primaryOrg?.organization?.id ?? null;
      } catch (err) {
        console.error("[CONTACT_FORM] Failed to resolve organizationId for agent:", err);
      }
    }

    // Get the agent profile
    const profile = await prismadb.agentProfile.findFirst({
      where: {
        userId: user.id,
        contactFormEnabled: true,
        visibility: { in: ["PUBLIC", "SECURE"] },
      },
      select: {
        id: true,
        contactFormFields: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Contact form not available" },
        { status: 400 }
      );
    }

    // Extract sender info from form data
    const senderName = body.name || body.full_name || body.firstName || null;
    const senderEmail = body.email || null;

    // Remove privacy consent from stored data
    const { privacyConsent, ...formData } = body;

    // Encrypt PII fields before persisting
    const encryptedData = organizationId
      ? await encryptAgentContactForOrg({ senderName, senderEmail, formData }, organizationId)
      : { senderName, senderEmail, formData };

    // Create the submission
    const submission = await prismadb.agentContactSubmission.create({
      data: {
        id: crypto.randomUUID(),
        profileId: profile.id,
        formData: encryptedData.formData as object,
        senderName: encryptedData.senderName,
        senderEmail: encryptedData.senderEmail,
        status: "NEW",
      },
    });

    // Create in-app notification for the agent
    await createNotification({
      userId: user.id,
      organizationId: organizationId ?? SYSTEM_ORG_ID,
      type: "CONTACT_FORM_SUBMISSION",
      title: user.userLanguage === "el" 
        ? "Νέα Υποβολή Φόρμας Επικοινωνίας" 
        : "New Contact Form Submission",
      message: senderName 
        ? (user.userLanguage === "el" 
            ? `Ο/Η ${senderName} σας έστειλε μήνυμα μέσω της φόρμας επικοινωνίας.`
            : `${senderName} sent you a message through your contact form.`)
        : (user.userLanguage === "el"
            ? "Λάβατε νέο μήνυμα μέσω της φόρμας επικοινωνίας."
            : "You received a new message through your contact form."),
      entityType: "CONTACT_SUBMISSION",
      entityId: submission.id,
      actorName: senderName || "Anonymous",
      metadata: {
        senderEmail,
        submissionId: submission.id,
      },
    });

    // Send email notification to the agent
    if (user.email) {
      try {
        const emailHtml = await render(
          AgentContactFormSubmission({
            agentName: user.name || "Agent",
            senderName: senderName || "Anonymous",
            senderEmail: senderEmail || "Not provided",
            formData: formData,
            submissionId: submission.id,
            locale: user.userLanguage || "en",
          })
        );

        await sendEmail({
          from: process.env.EMAIL_FROM as string,
          to: user.email,
          subject: user.userLanguage === "el"
            ? `Νέο μήνυμα από ${senderName || "επισκέπτη"} - Oikion`
            : `New message from ${senderName || "a visitor"} - Oikion`,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error("[CONTACT_FORM] Failed to send email notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("[CONTACT_FORM] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit form" },
      { status: 500 }
    );
  }
}
