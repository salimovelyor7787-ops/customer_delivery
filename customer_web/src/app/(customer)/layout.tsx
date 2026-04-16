import { BottomNav } from "@/components/customer/bottom-nav";
import { CartProvider } from "@/components/customer/cart-context";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="mx-auto min-h-screen max-w-3xl bg-zinc-50 pb-20">{children}</div>
      <BottomNav />
    </CartProvider>
  );
}
