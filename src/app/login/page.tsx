import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-xl font-medium">Log in</h1>

      {params.message && (
        <p className="text-sm text-green-700">{params.message}</p>
      )}
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
          placeholder="Password"
          className="rounded border px-3 py-2"
        />
        <button
          formAction={login}
          className="rounded bg-black px-3 py-2 text-white"
        >
          Log in
        </button>
      </form>

      <p className="text-sm">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
