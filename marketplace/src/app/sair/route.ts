import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/server/supabase";

/** Logout só por POST (evita logout disparado por links/imagens de terceiros). */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
}
