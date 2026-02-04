// @ts-nocheck
// TODO: Fix type errors
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { addDays, format, parse, isValid } from "date-fns";

/**
 * GET /api/ai/connections/birthdays
 * Get contacts with upcoming birthdays
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    // Get all contacts with birthdays
    const contacts = await prismadb.client_Contacts.findMany({
      where: {
        organizationId,
        birthday: { not: null },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        birthday: true,
        Clients: {
          select: {
            id: true,
            client_name: true,
          },
        },
      },
    });

    const today = new Date();
    const endDate = addDays(today, days);
    const currentYear = today.getFullYear();

    // Filter and sort by upcoming birthday
    const upcomingBirthdays = contacts
      .map((contact) => {
        if (!contact.birthday) return null;

        // Parse birthday (format: DD/MM/YYYY or DD-MM-YYYY)
        let birthDate: Date | null = null;
        const formats = ["dd/MM/yyyy", "dd-MM-yyyy", "yyyy-MM-dd"];
        
        for (const fmt of formats) {
          try {
            const parsed = parse(contact.birthday, fmt, new Date());
            if (isValid(parsed)) {
              birthDate = parsed;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!birthDate) return null;

        // Calculate this year's birthday
        const thisYearBirthday = new Date(
          currentYear,
          birthDate.getMonth(),
          birthDate.getDate()
        );

        // If birthday has passed this year, use next year
        let nextBirthday = thisYearBirthday;
        if (thisYearBirthday < today) {
          nextBirthday = new Date(
            currentYear + 1,
            birthDate.getMonth(),
            birthDate.getDate()
          );
        }

        // Check if within the specified days
        if (nextBirthday > endDate) return null;

        const daysUntil = Math.ceil(
          (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: contact.id,
          name: `${contact.first_name || ""} ${contact.last_name || ""}`.trim(),
          email: contact.email,
          phone: contact.phone,
          birthday: contact.birthday,
          nextBirthday: format(nextBirthday, "yyyy-MM-dd"),
          daysUntil,
          linkedClient: contact.Clients
            ? {
                id: contact.Clients.id,
                name: contact.Clients.client_name,
              }
            : null,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      birthdays: upcomingBirthdays,
      total: upcomingBirthdays.length,
      lookAheadDays: days,
    });
  } catch (error) {
    console.error("[AI_CONNECTIONS_BIRTHDAYS]", error);
    return NextResponse.json(
      { error: "Failed to fetch birthdays" },
      { status: 500 }
    );
  }
}
