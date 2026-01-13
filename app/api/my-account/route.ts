import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await getCurrentUser();
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

    await prismadb.myAccount.create({
      data: {
        id: crypto.randomUUID(),
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
      },
    });

    return NextResponse.json({ message: "Account created" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    await getCurrentUser();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { message: "Missing ID in body, ID is required" },
        { status: 400 }
      );
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

    await prismadb.myAccount.update({
      where: { id: id },
      data: {
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
      },
    });

    return NextResponse.json({ message: "Account updated" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
}

export async function GET() {
  try {
    await getCurrentUser();
    const accounts = await prismadb.myAccount.findMany({});
    return NextResponse.json(accounts, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
}
