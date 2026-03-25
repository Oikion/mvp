import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { NextResponse } from "next/server";
import { encryptMyAccountForOrg, decryptMyAccountForOrg } from "@/lib/model-encryption";
import { safeErrorResponse } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const {
      company_name,
      is_person,
      email,
      email_accountant,
      phone_prefix,
      phone,
      mobile_prefix,
      mobile,
      fax_prefix,
      fax,
      website,
      street,
      city,
      state,
      zip,
      country,
      country_code,
      billing_street,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      billing_country_code,
      currency,
      currency_symbol,
      VAT_number,
      TAX_number,
      bank_name,
      bank_account,
      bank_code,
      bank_IBAN,
      bank_SWIFT,
    } = body;

    // Encrypt sensitive banking/tax PII before storing
    const encryptedData = await encryptMyAccountForOrg(
      {
        VAT_number,
        TAX_number,
        bank_name,
        bank_account,
        bank_code,
        bank_IBAN,
        bank_SWIFT,
        email_accountant,
      },
      organizationId
    );

    await prismadb.myAccount.create({
      data: {
        id: crypto.randomUUID(),
        organizationId,
        company_name,
        is_person,
        email,
        phone_prefix,
        phone,
        mobile_prefix,
        mobile,
        fax_prefix,
        fax,
        website,
        street,
        city,
        state,
        zip,
        country,
        country_code,
        billing_street,
        billing_city,
        billing_state,
        billing_zip,
        billing_country,
        billing_country_code,
        currency,
        currency_symbol,
        ...encryptedData,
      },
    });

    return NextResponse.json({ message: "Account created" }, { status: 200 });
  } catch (error) {
    return safeErrorResponse(error, 500, "Failed to create account");
  }
}

export async function PUT(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { message: "Missing ID in body, ID is required" },
        { status: 400 }
      );
    }

    // IDOR prevention: verify the record belongs to the user's org
    const existing = await prismadb.myAccount.findFirst({
      where: { id: body.id, organizationId },
    });

    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const {
      id,
      company_name,
      is_person,
      email,
      email_accountant,
      phone_prefix,
      phone,
      mobile_prefix,
      mobile,
      fax_prefix,
      fax,
      website,
      street,
      city,
      state,
      zip,
      country,
      country_code,
      billing_street,
      billing_city,
      billing_state,
      billing_zip,
      billing_country,
      billing_country_code,
      currency,
      currency_symbol,
      VAT_number,
      TAX_number,
      bank_name,
      bank_account,
      bank_code,
      bank_IBAN,
      bank_SWIFT,
    } = body;

    // Encrypt sensitive banking/tax PII before updating
    const encryptedData = await encryptMyAccountForOrg(
      {
        VAT_number,
        TAX_number,
        bank_name,
        bank_account,
        bank_code,
        bank_IBAN,
        bank_SWIFT,
        email_accountant,
      },
      organizationId
    );

    await prismadb.myAccount.update({
      where: { id },
      data: {
        company_name,
        is_person,
        email,
        phone_prefix,
        phone,
        mobile_prefix,
        mobile,
        fax_prefix,
        fax,
        website,
        street,
        city,
        state,
        zip,
        country,
        country_code,
        billing_street,
        billing_city,
        billing_state,
        billing_zip,
        billing_country,
        billing_country_code,
        currency,
        currency_symbol,
        ...encryptedData,
      },
    });

    return NextResponse.json({ message: "Account updated" }, { status: 200 });
  } catch (error) {
    return safeErrorResponse(error, 500, "Failed to update account");
  }
}

export async function GET() {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();

    // Scope to organization — prevents cross-org data leak
    const accounts = await prismadb.myAccount.findMany({
      where: { organizationId },
    });

    // Decrypt PII fields before returning
    const decrypted = await Promise.all(
      accounts.map((acc) => decryptMyAccountForOrg(acc, organizationId))
    );

    return NextResponse.json(decrypted, { status: 200 });
  } catch (error) {
    return safeErrorResponse(error, 500, "Failed to fetch accounts");
  }
}
