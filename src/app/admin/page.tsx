import Link from "next/link";

export default function AdminPage() {
    return (
        <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
            <h1 className="text-xl font-medium">Administrare</h1>
            <Link href="/admin/cohorts" className="underline">
                Cohorte
            </Link>
            <Link href="/admin/submissions" className="underline">
                Trimiteri
            </Link>
            <Link href="/admin/stats" className="underline">
                Statistici și progres
            </Link>
            <Link href="/dashboard" className="text-sm underline">
                Înapoi la dashboard
            </Link>
        </main>
    );
}