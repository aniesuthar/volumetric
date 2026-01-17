import { createBrowserClient } from "@supabase/ssr"

let browserClient: ReturnType<
  typeof createBrowserClient<{
    id: string
    [key: string]: any
  }>
> | null = null

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient
  // These NEXT_PUBLIC_* envs are provided by the Supabase integration
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    console.warn("[v0] Supabase env is missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  browserClient = createBrowserClient<{ id: string;[key: string]: any }, "public">(url || "", anon || "")
  return browserClient
}
