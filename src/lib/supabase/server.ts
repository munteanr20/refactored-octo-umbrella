import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Call this inside Server Components, Server Actions, and Route Handlers.
// It reads/writes the auth cookies for the current request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component (no response to attach to).
            // Safe to ignore as long as middleware.ts is refreshing sessions.
          }
        },
      },
    }
  );
}
