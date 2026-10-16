import Link from "next/link";
import PageHeader from "@/components/page-header";
import SubmitButton from "@/components/submit-button";
import { login } from "./actions";

export const metadata = { title: "Autentificare" };

export default async function LoginPage({
                                            searchParams,
                                        }: {
    searchParams: Promise<{ error?: string; message?: string }>;
}) {
    const params = await searchParams;

    return (
        <main className="page page-narrow">
            <PageHeader title="Autentificare">
                Intră în cont cu adresa ta de student UPB.
            </PageHeader>

            <div className="card flex flex-col gap-5">
                {params.message && (
                    <p role="status" className="alert alert-ok">{params.message}</p>
                )}
                {params.error && (
                    <p role="alert" className="alert alert-error">{params.error}</p>
                )}

                <form action={login} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-sm font-semibold">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="nume.prenume@stud.acs.upb.ro"
                            className="field"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="password" className="text-sm font-semibold">Parolă</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            className="field"
                        />
                    </div>
                    <SubmitButton pendingLabel="Se verifică...">Intră în cont</SubmitButton>
                </form>
            </div>

            <p className="text-center text-sm text-ink-soft">
                Nu ai cont?{" "}
                <Link href="/signup" className="underline">Creează un cont</Link>
            </p>
        </main>
    );
}