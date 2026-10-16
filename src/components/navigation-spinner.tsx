"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Re-mounting on every route change resets the spinner automatically.
export default function NavigationSpinner() {
    const pathname = usePathname();
    return <Indicator key={pathname} />;
}

function Indicator() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let showTimer: ReturnType<typeof setTimeout> | undefined;
        let failsafe: ReturnType<typeof setTimeout> | undefined;

        function onClick(e: MouseEvent) {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

            const a = (e.target as Element | null)?.closest("a");
            if (!a || !a.href) return;
            if (a.target && a.target !== "_self") return;
            if (a.hasAttribute("download")) return;

            const url = new URL(a.href, window.location.href);
            if (url.origin !== window.location.origin) return;
            if (url.pathname === window.location.pathname) return;
            if (url.pathname.includes("/export-")) return; // file downloads never change the page

            clearTimeout(showTimer);
            clearTimeout(failsafe);
            // short delay so instant navigations don't flash a spinner
            showTimer = setTimeout(() => setVisible(true), 150);
            // never get stuck if the navigation fails
            failsafe = setTimeout(() => setVisible(false), 10000);
        }

        document.addEventListener("click", onClick, true);
        return () => {
            document.removeEventListener("click", onClick, true);
            clearTimeout(showTimer);
            clearTimeout(failsafe);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            role="status"
            className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm"
        >
            <span className="spinner" aria-hidden="true" />
            Se încarcă...
        </div>
    );
}