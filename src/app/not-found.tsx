import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-5xl font-semibold text-pin tabular">404</p>
        <h1 className="mt-3 text-xl font-semibold">This page isn't on the map</h1>
        <p className="mt-2 text-muted">Check the address, or head back to your dashboard.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-control bg-pin px-4 py-2 font-medium text-pin-ink">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
