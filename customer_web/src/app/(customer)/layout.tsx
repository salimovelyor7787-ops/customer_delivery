import { BottomNav } from "@/components/customer/bottom-nav";
import { CartProvider } from "@/components/customer/cart-context";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div className="mx-auto min-h-screen w-full max-w-7xl bg-zinc-50 pb-24 2xl:max-w-[90rem]">{children}</div>
      <BottomNav />
    </CartProvider>
  );
}
