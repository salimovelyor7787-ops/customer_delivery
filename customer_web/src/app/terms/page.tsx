import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Minutka",
  description: "Terms of Service for Minutka",
};

export default function TermsPage() {
  return (
    <main className="px-4 py-10 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-[800px] rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Terms of Service</h1>
          <p className="text-sm text-zinc-500">Effective date: 2026</p>
        </header>

        <div className="mt-6 space-y-6 text-base leading-7 text-zinc-700">
          <p>By using Minutka, you agree to these terms.</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Usage</h2>
            <p>You agree not to misuse the service.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Accounts</h2>
            <p>You are responsible for your account and activity.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Limitation of Liability</h2>
            <p>We are not responsible for any damages or data loss.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Changes</h2>
            <p>We may update these terms at any time.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
            <p>
              <a href="mailto:salimovelyor7787@gmail.com" className="text-orange-600 underline hover:text-orange-700">
                salimovelyor7787@gmail.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
