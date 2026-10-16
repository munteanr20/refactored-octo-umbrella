"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({
                                     links,
                                 }: {
    links: { href: string; label: string }[];
}) {
    const pathname = usePathname();

    return (
        <nav aria-label="Navigare principală" className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map((l) => {
                const active =
                    pathname === l.href ||
                    (l.href !== "/admin" && pathname.startsWith(l.href + "/"));
                return (
                    <Link
                        key={l.href}
                        href={l.href}
                        aria-current={active ? "page" : undefined}
                        className={`border-b-2 py-1 text-sm font-semibold no-underline ${
                            active ? "border-gold" : "border-transparent text-ink-soft hover:border-line"
                        }`}
                    >
                        {l.label}
                    </Link>
                );
            })}
        </nav>
    );
}