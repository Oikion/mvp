// @ts-nocheck
// DEPRECATED: Mandate routes migrated to /api/requests.
// This file is a 308 redirect stub. Task 15 (legacy deep-clean) will delete it.

import { NextResponse } from "next/server";

function redirectToRequests(req: Request): NextResponse {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/^\/api\/mandates/, "/api/requests");
  return NextResponse.redirect(url.toString(), { status: 308 });
}

export async function GET(req: Request) { return redirectToRequests(req); }
export async function POST(req: Request) { return redirectToRequests(req); }
export async function PUT(req: Request) { return redirectToRequests(req); }
export async function DELETE(req: Request) { return redirectToRequests(req); }
