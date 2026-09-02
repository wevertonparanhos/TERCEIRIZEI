import { NextResponse } from "next/server";
import { signOutCurrentSession } from "@/lib/services/auth-service";

export async function POST(request: Request) {
  await signOutCurrentSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
