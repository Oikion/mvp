import resendHelper from "@/lib/resend";
import { getCurrentUserSafe, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { NextResponse } from "next/server";
import FeedbackEmail from "@/emails/Feedback";
import { prismadb } from "@/lib/prisma";
import { uploadFeedbackFile } from "@/actions/upload";

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
    const organizationId = (await getCurrentOrgIdSafe()) || undefined;
    const body = await req.json();
    
    if (!body) {
      return new NextResponse("Missing body", { status: 400 });
    }
    
    const { feedback, feedbackType, screenshot, consoleLogs, userAgent, url, timestamp, screenResolution, attachmentIds } = body;

    if (!feedback) {
      return new NextResponse("Missing feedback", { status: 400 });
    }

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
      ? consoleLogs.filter((log: { type?: string }) => {
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
    const emailOptions: {
      from: string;
      to: string[];
      subject: string;
      react: React.ReactElement;
      attachments: Array<{ filename: string; content: string }>;
    } = {
      from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
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
        // Extract base64 data (remove data URL prefix if present)
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
        const filename = `screenshot-${Date.now()}.png`;
        
        emailOptions.attachments.push({
          filename: filename,
          content: base64Data, // Resend expects base64 string, not Buffer
        });
      } catch (error) {
        // Continue without screenshot if processing fails
      }
    }

    // Attach console logs as .txt file if available (only for bug reports)
    if (consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0) {
      try {
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
      } catch (error) {
        // Continue without console logs file if processing fails
      }
    }
    
    await resend.emails.send(emailOptions);
    
    // Save feedback to database (upload screenshot and console logs to Vercel Blob)
    try {
      // Generate feedback ID first for use in blob paths
      const feedbackId = crypto.randomUUID();
      const orgIdForBlob = organizationId || "platform";
      
      // Upload screenshot with compression (PNG → WebP via unified action)
      let screenshotUrl: string | null = null;
      if (screenshot && typeof screenshot === 'string') {
        try {
          // Extract base64 data (remove data URL prefix if present)
          const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, "");
          const screenshotBuffer = Buffer.from(base64Data, 'base64');
          const screenshotFileName = `feedback-screenshot-${feedbackId}.png`;
          
          const result = await uploadFeedbackFile(
            screenshotBuffer,
            screenshotFileName,
            "image/png",
            orgIdForBlob
          );
          screenshotUrl = result.url;
        } catch (uploadError) {
          console.error("[FEEDBACK_SCREENSHOT_UPLOAD]", uploadError);
          // Continue without screenshot URL if upload fails
        }
      }
      
      // Upload console logs to Vercel Blob as text file if available
      let consoleLogsUrl: string | null = null;
      if (consoleLogs && Array.isArray(consoleLogs) && consoleLogs.length > 0) {
        try {
          // Format console logs as text (reuse the formatting from email attachment)
          let logsText = `Console Logs Capture\n`;
          logsText += `===================\n\n`;
          logsText += `Feedback ID: ${feedbackId}\n`;
          logsText += `Total entries: ${consoleLogs.length}\n`;
          logsText += `Captured at: ${timestamp || new Date().toISOString()}\n\n`;
          logsText += `--- Log Entries ---\n\n`;
          
          for (const log of consoleLogs) {
            const index = consoleLogs.indexOf(log) + 1;
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
          
          const logsBuffer = Buffer.from(logsText, 'utf-8');
          const logsFileName = `feedback-console-logs-${feedbackId}.txt`;
          
          // Upload with automatic gzip compression for large text files
          const result = await uploadFeedbackFile(
            logsBuffer,
            logsFileName,
            "text/plain",
            orgIdForBlob
          );
          consoleLogsUrl = result.url;
        } catch (uploadError) {
          console.error("[FEEDBACK_CONSOLELOGS_UPLOAD]", uploadError);
          // Continue without console logs URL if upload fails
        }
      }
      
      const feedbackRecord = await prismadb.feedback.create({
        data: {
          id: feedbackId,
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
          hasScreenshot: !!screenshotUrl,
          hasConsoleLogs: !!consoleLogsUrl,
          consoleLogsCount: consoleLogs && Array.isArray(consoleLogs) ? consoleLogs.length : 0,
          screenshot: screenshotUrl, // Store Vercel Blob URL instead of base64
          consoleLogsUrl: consoleLogsUrl, // Store Vercel Blob URL for console logs
          status: "pending",
          emailSent: true,
          emailSentAt: new Date(),
        },
      });

      // Link attachments to the feedback
      if (attachmentIds && Array.isArray(attachmentIds) && attachmentIds.length > 0 && currentUser?.id) {
        await prismadb.attachment.updateMany({
          where: {
            id: { in: attachmentIds },
            uploadedById: currentUser.id,
            feedbackId: null, // Only link unattached ones
          },
          data: {
            feedbackId: feedbackRecord.id,
          },
        });
      }
    } catch (dbError) {
      // Don't fail the request if database save fails
      console.error("[FEEDBACK_DB_ERROR]", dbError);
    }
    
    return NextResponse.json({ message: "Feedback sent" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
