import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/sign-out";
import NavLinks from "./nav-links";

function Ring() {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            <circle cx="14" cy="14" r="10" fill="none" stroke="var(--gold)" strokeWidth="3" />
            <circle
                cx="14" cy="14" r="10" fill="none"
                stroke="var(--brand)" strokeWidth="0.75" strokeDasharray="2 3"
            />
        </svg>
    );
}

export default async function SiteHeader() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isAdmin = false;
    if (user) {
        const { data } = await supabase.rpc("is_admin");
        isAdmin = data === true;
    }

    const links = !user
        ? [
            { href: "/login", label: "Autentificare" },
            { href: "/signup", label: "Cont nou" },
        ]
        : isAdmin
            ? [
                { href: "/admin", label: "Acasă" },
                { href: "/admin/cohorts", label: "Cohorte" },
                { href: "/admin/submissions", label: "Trimiteri" },
                { href: "/admin/stats", label: "Statistici" },
            ]
            : [
                { href: "/dashboard", label: "Acasă" },
                { href: "/submission", label: "Itemii mei" },
                { href: "/validate", label: "Validare" },
            ];

    return (
        <header className="border-b border-line bg-surface">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
                <Link href="/" className="flex items-center gap-2 no-underline">
                    <Ring />
                    <span className="font-display text-lg">Laboratorul de Statistică</span>
                </Link>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <NavLinks links={links} />
                    {user && (
                        <form action={signOut} className="flex items-center gap-3">
                            <span className="hidden max-w-[12rem] truncate text-sm text-ink-soft sm:inline">
                                {user.email}
                            </span>
                            <button className="btn btn-quiet !min-h-0 !px-2 !py-1 text-sm">
                                Ieși din cont
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </header>
    );
}