"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { CartDrawer } from "@/app/components/cart-drawer";
import { Icon } from "@/app/components/ui/icons";
import {
  apiRequest,
  clearCartToken,
  writeCartToken,
} from "@/lib/client-api";
import { cx } from "@/lib/cx";
import type { Cart, CartLine } from "@/lib/api-types";
import { formatPrice } from "@/lib/format";

export type Toast = {
  id: number;
  message: string;
  tone: "success" | "error";
  action?: { label: string; run: () => void };
};

type Addable = { id: number; name: string };

type CartContextValue = {
  cart: Cart | null;
  lines: CartLine[];
  count: number;
  subtotalCents: number;
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  didJustAdd: boolean;
  isPending: (productId: number) => boolean;
  open: () => void;
  close: () => void;
  refresh: () => Promise<void>;
  addItem: (product: Addable, options?: { open?: boolean; quantity?: number }) => Promise<boolean>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearError: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [didJustAdd, setDidJustAdd] = useState(false);
  const toastSeq = useRef(0);
  const inFlight = useRef<Promise<Cart> | null>(null);

  const pushToast = useCallback((toast: Omit<Toast, "id">, ttl = 6500) => {
    const id = ++toastSeq.current;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, ttl);
  }, []);

  const dismissToast = useCallback(
    (id: number) => setToasts((current) => current.filter((item) => item.id !== id)),
    [],
  );

  const commit = useCallback((next: Cart) => {
    // `cart_token` is only sent by the request that creates a guest cart.
    if (next.cart_token) writeCartToken(next.cart_token);
    setCart(next);
    return next;
  }, []);

  const load = useCallback((): Promise<Cart> => {
    if (inFlight.current) return inFlight.current;
    const request = apiRequest<Cart>("cart")
      .then(commit)
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = request;
    return request;
  }, [commit]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your bag could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  // Signing in merges the guest bag server-side; re-read the merged cart.
  useEffect(() => {
    const handler = () => {
      clearCartToken();
      void refresh();
    };
    window.addEventListener("bazaar:auth-changed", handler);
    return () => window.removeEventListener("bazaar:auth-changed", handler);
  }, [refresh]);

  const markPending = useCallback((productId: number, on: boolean) => {
    setPending((current) =>
      on ? [...new Set([...current, productId])] : current.filter((id) => id !== productId),
    );
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const lines = cart?.items ?? [];

    const restore = (snapshot: Cart | null) => {
      if (snapshot) setCart(snapshot);
    };

    const fail = (reason: unknown, fallback: string) => {
      const message = reason instanceof Error ? reason.message : fallback;
      setError(message);
      pushToast({ message, tone: "error" });
    };

    return {
      cart,
      lines,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      subtotalCents: cart?.subtotal_cents ?? 0,
      isLoading,
      error,
      isOpen,
      didJustAdd,
      isPending: (productId) => pending.includes(productId),
      open: () => {
        setIsOpen(true);
        void refresh();
      },
      close: () => setIsOpen(false),
      refresh,
      clearError: () => setError(null),

      async addItem(product, options = {}) {
        markPending(product.id, true);
        setError(null);
        try {
          const next = await apiRequest<Cart>("cart/items", {
            method: "POST",
            body: { product_id: product.id, quantity: options.quantity ?? 1 },
          });
          commit(next);
          setDidJustAdd(true);
          window.setTimeout(() => setDidJustAdd(false), 500);
          if (options.open) setIsOpen(true);
          pushToast({
            message: `Added to bag · ${product.name}`,
            tone: "success",
            action: { label: "View bag", run: () => setIsOpen(true) },
          });
          return true;
        } catch (reason) {
          fail(reason, "That item could not be added to your bag.");
          return false;
        } finally {
          markPending(product.id, false);
        }
      },

      async setQuantity(productId, quantity) {
        const snapshot = cart;
        markPending(productId, true);
        setError(null);
        setCart((current) => {
          if (!current) return current;
          const items = current.items.map((line) =>
            line.product_id === productId
              ? { ...line, quantity, line_total_cents: line.unit_price_cents * quantity }
              : line,
          );
          return {
            ...current,
            items,
            subtotal_cents: items.reduce((total, line) => total + line.line_total_cents, 0),
          };
        });
        try {
          commit(await apiRequest<Cart>(`cart/items/${productId}`, {
            method: "PATCH",
            body: { quantity },
          }));
        } catch (reason) {
          restore(snapshot);
          fail(reason, "That quantity was not accepted.");
        } finally {
          markPending(productId, false);
        }
      },

      async removeItem(productId) {
        const snapshot = cart;
        const removed = snapshot?.items.find((line) => line.product_id === productId);
        markPending(productId, true);
        setError(null);
        try {
          commit(await apiRequest<Cart>(`cart/items/${productId}`, { method: "DELETE" }));
          if (removed) {
            pushToast(
              {
                message: `Removed · ${removed.product_name}`,
                tone: "success",
                action: {
                  label: "Undo",
                  run: () => {
                    void apiRequest<Cart>("cart/items", {
                      method: "POST",
                      body: { product_id: removed.product_id, quantity: removed.quantity },
                    })
                      .then(commit)
                      .catch((reason) => fail(reason, "That item could not go back in your bag."));
                  },
                },
              },
              8000,
            );
          }
        } catch (reason) {
          restore(snapshot);
          fail(reason, "That item could not be removed.");
        } finally {
          markPending(productId, false);
        }
      },
    };
  }, [cart, commit, didJustAdd, error, isOpen, isLoading, markPending, pending, pushToast, refresh]);

  return (
    <CartContext.Provider value={value}>
      <div id="shell" className="shell" inert={isOpen || undefined}>
        {children}
      </div>
      {isOpen ? <CartDrawer /> : null}
      <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <span className={cx("toast__icon", toast.tone === "error" && "toast__icon--error")}>
              {toast.tone === "error" ? <Icon.Alert size={17} /> : <Icon.CircleCheck size={17} />}
            </span>
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  toast.action?.run();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              <Icon.Close size={14} />
            </button>
          </div>
        ))}
      </div>
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}

/** Masthead island: the header is server-rendered, the bag count is not. */
export function CartButton() {
  const { count, open, subtotalCents, isLoading, didJustAdd } = useCart();
  return (
    <button
      type="button"
      className="header-link cart-btn"
      data-pop={didJustAdd ? "true" : undefined}
      onClick={open}
      aria-label={
        isLoading
          ? "Open shopping bag, loading"
          : count === 0
            ? "Open shopping bag, empty"
            : `Open shopping bag, ${count} item${count === 1 ? "" : "s"}, ${formatPrice(subtotalCents)}`
      }
    >
      <Icon.Bag size={19} />
      {count > 0 ? <span className="badge" aria-hidden="true">{count}</span> : null}
    </button>
  );
}
