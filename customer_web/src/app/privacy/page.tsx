import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Minutka",
  description: "Privacy Policy for Minutka",
};

export default function PrivacyPage() {
  return (
    <main className="px-4 py-10 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-[800px] rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-zinc-900">Privacy Policy</h1>
          <p className="text-sm text-zinc-500">Effective date: 2026</p>
        </header>

        <div className="mt-6 space-y-6 text-base leading-7 text-zinc-700">
          <p>{"Minutka (\"we\", \"our\", \"us\") respects your privacy."}</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Information We Collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Name</li>
              <li>Email address</li>
              <li>Profile data from Google authentication</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">How We Use Information</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To authenticate users</li>
              <li>To provide and improve our service</li>
              <li>To communicate with users</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Data Protection</h2>
            <p>We do not sell, rent, or share your personal data with third parties.</p>
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
