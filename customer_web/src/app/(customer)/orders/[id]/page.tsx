"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderDetailPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/cart");
  }, [router]);

  return <main className="p-4 text-sm text-zinc-500">Yo&apos;naltirilmoqda...</main>;
}
