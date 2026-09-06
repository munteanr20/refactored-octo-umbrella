import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-xl font-medium">Sign up</h1>

      {params.error && <p className="text-sm text-red-700">{params.error}</p>}

      <form className="flex flex-col gap-4">
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Password"
          className="rounded border px-3 py-2"
        />
        <button
          formAction={signup}
          className="rounded bg-black px-3 py-2 text-white"
        >
          Sign up
        </button>
      </form>

      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
