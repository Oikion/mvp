import resendHelper from "@/lib/resend";
import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { NextResponse } from "next/server";
import FeedbackEmail from "@/emails/Feedback";
import { prismadb } from "@/lib/prisma";

// Helper function to parse user agent string
function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { browserName: undefined, browserVersion: undefined, osName: undefined, osVersion: undefined };

  let browserName: string | undefined;
  let browserVersion: string | undefined;
  let osName: string | undefined;
  let osVersion: string | undefined;

  // Parse browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browserName = "Chrome";
    const match = userAgent.match(/Chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes("Firefox")) {
    browserName = "Firefox";
    const match = userAgent.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browserName = "Safari";
    const match = userAgent.match(/Version\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes("Edg")) {
    browserName = "Edge";
    const match = userAgent.match(/Edg\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    browserName = "Opera";
    const match = userAgent.match(/(?:Opera|OPR)\/([\d.]+)/);
    browserVersion = match ? match[1] : undefined;
  }

  // Parse OS
  if (userAgent.includes("Windows NT")) {
    osName = "Windows";
    const match = userAgent.match(/Windows NT ([\d.]+)/);
    if (match) {
      const version = match[1];
      const versionMap: Record<string, string> = {
        "10.0": "10",
        "6.3": "8.1",
        "6.2": "8",
        "6.1": "7",
      };
      osVersion = versionMap[version] || version;
    }
  } else if (userAgent.includes("Mac OS X") || userAgent.includes("Macintosh")) {
    osName = "macOS";
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, ".");
    }
  } else if (userAgent.includes("Linux")) {
    osName = "Linux";
  } else if (userAgent.includes("Android")) {
    osName = "Android";
    const match = userAgent.match(/Android ([\d.]+)/);
    osVersion = match ? match[1] : undefined;
  } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    osName = "iOS";
    const match = userAgent.match(/OS ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, ".");
    }
  }

  return { browserName, browserVersion, osName, osVersion };
}

export async function POST(req: Request) {
  const resend = await resendHelper();
  
  try {
    const currentUser = await getCurrentUserSafe();
    const organizationId = await getCurrentOrgIdSafe();
    const body = await req.json();
    
    if (!body) {
      return new NextResponse("Missing body", { status: 400 });
    }
    
    const { feedback, feedbackType, screenshot, consoleLogs, userAgent, url, timestamp, screenResolution } = body;

    if (!feedback) {
      return new NextResponse("Missing feedback", { status: 400 });
    }

    // Debug logging
    console.log("[FEEDBACK_POST] Console logs received:", consoleLogs ? `${consoleLogs.length} entries` : "none");
    console.log("[FEEDBACK_POST] Screenshot received:", screenshot ? "yes" : "no");

    const feedbackTypeLabels: Record<string, string> = {
      bug: "Bug Report",
      feature: "Feature Request",
      general: "General Feedback",
      question: "Question",
      other: "Other",
    };
    
    const feedbackTypeLabel = feedbackType 
      ? feedbackTypeLabels[feedbackType] || feedbackType.charAt(0).toUpperCase() + feedbackType.slice(1)
      : "General";

    // Parse user agent for browser and OS info
    const { browserName, browserVersion, osName, osVersion } = parseUserAgent(userAgent);

    // Filter console logs to only warnings and errors for email display
    const filteredConsoleLogs = consoleLogs && Array.isArray(consoleLogs)
      ? consoleLogs.filter((log: any) => {
          const logType = log.type?.toLowerCase() || '';
          return logType === 'warning' || logType === 'error' || logType === 'warn' || logType === 'err';
        })
      : undefined;

    // Prepare recipients: feedback email and user's email (if authenticated)
    const feedbackEmail = process.env.FEEDBACK_EMAIL || "info@softbase.cz";
    const recipients: string[] = [feedbackEmail];
    
    // Add user's email if authenticated
    if (currentUser?.email) {
      recipients.push(currentUser.email);
    }

    // Prepare email with screenshot attachment if available
    const emailOptions: any = {
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: recipients,
      subject: `[${feedbackTypeLabel}] New Feedback from: ${process.env.NEXT_PUBLIC_APP_URL}`,
      react: FeedbackEmail({
        feedbackType: feedbackType || "general",
        feedbackTypeLabel,
        feedback,
        userId: currentUser?.id,
        userName: currentUser?.name || undefined,
        userEmail: currentUser?.email || undefined,
        organizationId: organizationId || undefined,
        url,
        browserName,
        browserVersion,
        osName,
        osVersion,
        screenResolution,
        timestamp,
        consoleLogs: filteredConsoleLogs,
        hasScreenshot: !!screenshot,
        hasConsoleLogsFile: !!(consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0),
      }),
      attachments: [],
    };

    // Attach screenshot if available (only for bug reports)
    if (screenshot && typeof screenshot === 'string') {
      try {
        console.log("[FEEDBACK_POST] Processing screenshot for attachment...");
        // Extract base64 data (remove data URL prefix if present)
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
        const filename = `screenshot-${Date.now()}.png`;
        
        emailOptions.attachments.push({
          filename: filename,
          content: base64Data, // Resend expects base64 string, not Buffer
        });
        
        console.log(`[FEEDBACK_POST] Screenshot attached: ${filename} (${base64Data.length} chars)`);
      } catch (error) {
        console.error("[FEEDBACK_POST] Failed to process screenshot:", error);
        // Continue without screenshot if processing fails
      }
    } else {
      console.log("[FEEDBACK_POST] No screenshot to attach");
    }
    
    console.log(`[FEEDBACK_POST] Total attachments: ${emailOptions.attachments.length}`);

    // Attach console logs as .txt file if available (only for bug reports)
    if (consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0) {
      try {
        console.log("[FEEDBACK_POST] Processing console logs for attachment...");
        // Format all console logs as text
        let logsText = `Console Logs Capture\n`;
        logsText += `===================\n\n`;
        logsText += `Total entries: ${consoleLogs.length}\n`;
        logsText += `Captured at: ${timestamp || new Date().toISOString()}\n\n`;
        logsText += `--- Log Entries ---\n\n`;
        
        for (const log of consoleLogs) {
          const index = consoleLogs.indexOf(log) + 1;
          // Handle timestamp - it might be a number (milliseconds) or ISO string
          let dateStr = 'Unknown';
          try {
            if (typeof log.timestamp === 'number') {
              dateStr = new Date(log.timestamp).toLocaleString();
            } else if (log.timestamp) {
              dateStr = new Date(log.timestamp).toLocaleString();
            }
          } catch (e) {
            dateStr = String(log.timestamp || 'Unknown');
          }
          
          const logType = (log.type || 'log').toUpperCase();
          logsText += `[${index}] ${dateStr} [${logType}]\n`;
          logsText += `   Message: ${log.message || 'N/A'}\n`;
          if (log.stack) {
            logsText += `   Stack: ${log.stack}\n`;
          }
          if (log.args && Array.isArray(log.args) && log.args.length > 0) {
            try {
              logsText += `   Args: ${JSON.stringify(log.args, null, 2)}\n`;
            } catch (e) {
              logsText += `   Args: [Unable to stringify]\n`;
            }
          }
          logsText += `\n`;
        }
        
        // Convert text to base64 for Resend attachment
        const logsBuffer = Buffer.from(logsText, 'utf-8');
        const logsBase64 = logsBuffer.toString('base64');
        const filename = `console-logs-${Date.now()}.txt`;
        
        emailOptions.attachments.push({
          filename: filename,
          content: logsBase64, // Resend expects base64 string
        });
        
        console.log(`[FEEDBACK_POST] Console logs file attached: ${filename} (${logsBase64.length} chars, ${logsBuffer.length} bytes)`);
      } catch (error) {
        console.error("[FEEDBACK_POST] Failed to process console logs:", error);
        // Continue without console logs file if processing fails
      }
    } else {
      console.log("[FEEDBACK_POST] No console logs to attach");
    }

    console.log(`[FEEDBACK_POST] Sending email to: ${recipients.join(", ")}`);
    console.log(`[FEEDBACK_POST] Attachments count: ${emailOptions.attachments.length}`);
    
    const result = await resend.emails.send(emailOptions);
    console.log("[FEEDBACK_POST] Email sent successfully:", result);
    
    // Save feedback to database
    try {
      await prismadb.feedback.create({
        data: {
          userId: currentUser?.id,
          userEmail: currentUser?.email,
          userName: currentUser?.name,
          organizationId: organizationId,
          feedbackType: feedbackType || "general",
          feedback: feedback,
          url: url,
          userAgent: userAgent,
          browserName: browserName,
          browserVersion: browserVersion,
          osName: osName,
          osVersion: osVersion,
          screenResolution: screenResolution,
          hasScreenshot: !!screenshot,
          hasConsoleLogs: !!(consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0),
          consoleLogsCount: consoleLogs && Array.isArray(consoleLogs) ? consoleLogs.length : 0,
          emailSent: true,
          emailSentAt: new Date(),
        },
      });
      console.log("[FEEDBACK_POST] Feedback saved to database");
    } catch (dbError) {
      console.error("[FEEDBACK_POST] Failed to save feedback to database:", dbError);
      // Don't fail the request if database save fails
    }
    
    return NextResponse.json({ message: "Feedback sent" }, { status: 200 });
  } catch (error) {
    console.log("[FEEDBACK_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
