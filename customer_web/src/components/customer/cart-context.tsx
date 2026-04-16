"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
  restaurantId: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  addItemWithRestaurantGuard: (item: Omit<CartItem, "quantity">) => { switched: boolean };
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  totalCents: number;
  totalCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "customer_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue["addItem"] = (item) => {
    setItems((prev) => {
      const index = prev.findIndex((line) => line.id === item.id);
      if (index < 0) return [...prev, { ...item, quantity: 1 }];
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      return next;
    });
  };

  const addItemWithRestaurantGuard: CartContextValue["addItemWithRestaurantGuard"] = (item) => {
    let switched = false;
    setItems((prev) => {
      const currentRestaurantId = prev[0]?.restaurantId;
      if (currentRestaurantId && currentRestaurantId !== item.restaurantId) {
        switched = true;
        return [{ ...item, quantity: 1 }];
      }
      const index = prev.findIndex((line) => line.id === item.id);
      if (index < 0) return [...prev, { ...item, quantity: 1 }];
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      return next;
    });
    return { switched };
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const setQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const clear = () => setItems([]);
  const totalCents = useMemo(() => items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0), [items]);
  const totalCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  return <CartContext.Provider value={{ items, addItem, addItemWithRestaurantGuard, removeItem, setQuantity, clear, totalCents, totalCount }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
