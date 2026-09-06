import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-xl font-medium">Admin area</h1>
      <p className="text-sm text-gray-600">
        Only visible to role = admin. Middleware already enforced this before
        this page rendered.
      </p>
      <Link href="/dashboard" className="text-sm underline">
        Back to dashboard
      </Link>
    </main>
  );
}
