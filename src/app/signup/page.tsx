import Link from "next/link";
import PageHeader from "@/components/page-header";
import SubmitButton from "@/components/submit-button";
import { signup } from "./actions";

export const metadata = { title: "Cont nou" };

export default async function SignupPage({
                                             searchParams,
                                         }: {
    searchParams: Promise<{ error?: string }>;
}) {
    const params = await searchParams;

    return (
        <main className="page page-narrow">
            <PageHeader title="Cont nou">
                Folosește adresa ta UPB (@stud.acs.upb.ro sau alt domeniu upb.ro).
            </PageHeader>

            <div className="card flex flex-col gap-5">
                {params.error && (
                    <p role="alert" className="alert alert-error">{params.error}</p>
                )}

                <form action={signup} className="flex flex-col gap-4">
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
                            minLength={6}
                            autoComplete="new-password"
                            className="field"
                            aria-describedby="password-hint"
                        />
                        <p id="password-hint" className="text-sm text-ink-soft">Minim 6 caractere.</p>
                    </div>
                    <SubmitButton pendingLabel="Se creează contul...">Creează contul</SubmitButton>
                </form>
            </div>

            <p className="text-center text-sm text-ink-soft">
                Ai deja cont?{" "}
                <Link href="/login" className="underline">Autentifică-te</Link>
            </p>
        </main>
    );
}