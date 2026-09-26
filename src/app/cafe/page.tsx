"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CafeItem, CafeCategory, CafeOrder, CafeOrderItem } from "@/types";
import {
  Coffee,
  Package,
  Wallet,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Minus,
  Check,
  Percent,
} from "lucide-react";
import { useSession } from "next-auth/react";
import confetti from "canvas-confetti";

function CafeContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "pos" | "inventory" | "collect") || "pos";

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [activeTab, setActiveTab] = useState<"pos" | "inventory" | "collect">(initialTab);
  const [items, setItems] = useState<CafeItem[]>([]);
  const [orders, setOrders] = useState<CafeOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // POS State
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [itemSearch, setItemSearch] = useState("");
  const [cart, setCart] = useState<Record<string, { item: CafeItem; quantity: number }>>({});
  const [playerName, setPlayerName] = useState("");
  const [isWalkin, setIsWalkin] = useState(false);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<"cash" | "online" | "bill">("bill");
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Inventory Management State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItemForRestock, setSelectedItemForRestock] = useState<CafeItem | null>(null);
  const [restockAmount, setRestockAmount] = useState<number | "">("");

  // Add Item Form
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<CafeCategory>("Beverages");
  const [newItemPurchasePrice, setNewItemPurchasePrice] = useState<number | "">("");
  const [newItemSalePrice, setNewItemSalePrice] = useState<number | "">("");
  const [newItemStock, setNewItemStock] = useState<number | "">("");

  // Cash Collect State
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectSuccess, setCollectSuccess] = useState(false);

  const fetchCafeData = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsRes, ordersRes] = await Promise.all([
        fetch("/api/cafe/items"),
        fetch("/api/cafe/orders"),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (err) {
      console.error("Café fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCafeData();
  }, [fetchCafeData]);

  // Sync tab from URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab") as "pos" | "inventory" | "collect";
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  /* =========================================================================
     POS Cart Controls
     ========================================================================= */
  const addToCart = (item: CafeItem) => {
    if (item.stock <= 0) return;
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = existing ? Math.min(item.stock, existing.quantity + 1) : 1;
      return {
        ...prev,
        [item.id]: { item, quantity: newQty },
      };
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const newQty = current.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...current, quantity: Math.min(current.item.stock, newQty) },
      };
    });
  };

  const clearCart = () => {
    setCart({});
    setCartDiscount(0);
  };

  const cartList = Object.values(cart);
  const subtotal = cartList.reduce(
    (sum, c) => sum + c.item.sale_price * c.quantity,
    0
  );
  const netTotal = Math.max(0, subtotal - cartDiscount);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartList.length === 0) return;

    if (!isWalkin && !playerName.trim()) {
      alert("Please enter the player name to link this order to their open bill, or check 'Walk-in customer'");
      return;
    }

    try {
      const orderItems: CafeOrderItem[] = cartList.map(({ item, quantity }) => ({
        itemId: item.id,
        name: item.name,
        category: item.category,
        quantity,
        unitPrice: item.sale_price,
        subtotal: item.sale_price * quantity,
      }));

      const res = await fetch("/api/cafe/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_name_or_walkin: isWalkin ? "Walk-in Guest" : playerName.trim(),
          is_walkin: isWalkin,
          items: orderItems,
          total: subtotal,
          discount: cartDiscount,
          net_total: netTotal,
          payment_method: isWalkin ? (orderPaymentMethod === "bill" ? "cash" : orderPaymentMethod) : orderPaymentMethod,
          employee_id: session?.user?.id || "usr-emp-1",
          employee_name: session?.user?.name || "Club Staff",
        }),
      });

      if (res.ok) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
        clearCart();
        setPlayerName("");
        setIsWalkin(false);
        setOrderSuccess(true);
        setTimeout(() => setOrderSuccess(false), 4000);
        fetchCafeData();
      }
    } catch (err) {
      console.error("Place order error:", err);
    }
  };

  /* =========================================================================
     Inventory Controls
     ========================================================================= */
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPurchasePrice || !newItemSalePrice) return;

    try {
      const res = await fetch("/api/cafe/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName.trim(),
          category: newItemCategory,
          purchase_price: Number(newItemPurchasePrice),
          sale_price: Number(newItemSalePrice),
          stock: Number(newItemStock) || 0,
        }),
      });
      if (res.ok) {
        setIsAddItemOpen(false);
        setNewItemName("");
        setNewItemPurchasePrice("");
        setNewItemSalePrice("");
        setNewItemStock("");
        fetchCafeData();
      }
    } catch (err) {
      console.error("Add cafe item error:", err);
    }
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForRestock || !restockAmount || Number(restockAmount) <= 0) return;

    try {
      const res = await fetch("/api/cafe/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedItemForRestock.id,
          addStock: Number(restockAmount),
          actor_id: session?.user?.id,
          actor_name: session?.user?.name,
        }),
      });
      if (res.ok) {
        setIsRestockOpen(false);
        setSelectedItemForRestock(null);
        setRestockAmount("");
        fetchCafeData();
      }
    } catch (err) {
      console.error("Restock error:", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Remove this item from café inventory?")) return;
    try {
      const res = await fetch(`/api/cafe/items?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchCafeData();
    } catch (err) {
      console.error("Delete cafe item error:", err);
    }
  };

  /* =========================================================================
     Cash Collect
     ========================================================================= */
  const uncollectedCashTotal = orders
    .filter((o) => o.payment_method === "cash" && o.status === "completed")
    .reduce((sum, o) => sum + o.net_total, 0);

  const handleCashCollect = async () => {
    if (!isAdmin) {
      alert("Unauthorized: Cash Collect is restricted to the Owner/Admin.");
      return;
    }
    if (!confirm(`Confirm collecting Rs. ${uncollectedCashTotal} from the café cash drawer?`)) {
      return;
    }

    try {
      const res = await fetch("/api/cafe/cash-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: uncollectedCashTotal,
          actor_id: session?.user?.id,
          actor_name: session?.user?.name,
          role: session?.user?.role,
        }),
      });
      if (res.ok) {
        setCollectSuccess(true);
        setTimeout(() => setCollectSuccess(false), 5000);
        fetchCafeData();
      }
    } catch (err) {
      console.error("Cash collect error:", err);
    }
  };

  // Filter items in menu grid
  const filteredItems = items.filter((i) => {
    if (selectedCategory !== "all" && i.category !== selectedCategory) return false;
    if (itemSearch.trim() && !i.name.toLowerCase().includes(itemSearch.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  return (
    <AppShell title="Café POS & Inventory Station">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#163022] pb-2">
        <button
          onClick={() => setActiveTab("pos")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            activeTab === "pos"
              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Coffee className="h-4 w-4 text-emerald-400" />
          <span>Café POS (Order Counter)</span>
        </button>

        {isAdmin ? (
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "inventory"
                ? "bg-amber-950 text-amber-300 border border-amber-800"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Package className="h-4 w-4 text-amber-400" />
            <span>Café Inventory ({items.length} items)</span>
          </button>
        ) : (
          <div
            title="Admin Only"
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-gray-600 cursor-not-allowed opacity-50"
          >
            <Package className="h-4 w-4" />
            <span>Inventory (Admin)</span>
          </div>
        )}

        {isAdmin ? (
          <button
            onClick={() => setActiveTab("collect")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeTab === "collect"
                ? "bg-teal-950 text-teal-300 border border-teal-800"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Wallet className="h-4 w-4 text-teal-400" />
            <span>Cash Collect Drawer</span>
          </button>
        ) : (
          <div
            title="By Owner Only"
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-gray-600 cursor-not-allowed opacity-50"
          >
            <Wallet className="h-4 w-4" />
            <span>Cash Collect (By Owner)</span>
          </div>
        )}
      </div>

      {/* =========================================================
          TAB 1: POS (EMPLOYEE / COUNTER TERMINAL)
         ========================================================= */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Menu Grid & Category Filters */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order for player toolbar */}
            <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-4 shadow">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Order For (Player Name)
                  </label>
                  <input
                    type="text"
                    disabled={isWalkin}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Type or pick player on active table..."
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 sm:pt-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWalkin}
                      onChange={(e) => {
                        setIsWalkin(e.target.checked);
                        if (e.target.checked) setPlayerName("Walk-in Guest");
                        else setPlayerName("");
                      }}
                      className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-amber-300">
                      Walk-in customer — no game linked
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Categories & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {(
                  [
                    "all",
                    "Beverages",
                    "Hot Drinks",
                    "Snacks",
                    "Cigarettes",
                    "Fast Food",
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? "bg-amber-500 text-gray-950 shadow"
                        : "bg-[#0d1e15] text-gray-400 hover:text-white border border-[#1b3a2a]"
                    }`}
                  >
                    {cat === "all" ? "All Items" : cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search item..."
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] pl-8 pr-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stock <= 0;
                const isLowStock = item.stock > 0 && item.stock <= 5;
                const inCart = cart[item.id]?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => !isOutOfStock && addToCart(item)}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all shadow select-none ${
                      isOutOfStock
                        ? "border-gray-900 bg-[#07110c] opacity-50 cursor-not-allowed"
                        : "border-[#1b3a2a] bg-[#0d1f16] hover:border-amber-500/50 hover:bg-[#132c1f] cursor-pointer active:scale-98"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-gray-500">
                          {item.category}
                        </span>
                        {inCart > 0 && (
                          <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-gray-950">
                            {inCart}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-white mt-1 group-hover:text-amber-300 transition-colors">
                        {item.name}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-emerald-950 pt-2">
                      <span className="text-sm font-black text-amber-400">
                        Rs. {item.sale_price}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          isOutOfStock
                            ? "text-rose-400"
                            : isLowStock
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {isOutOfStock ? "Out of Stock" : `${item.stock} left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Cart Panel */}
          <div className="rounded-2xl border border-amber-500/30 bg-[#0a1811] p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#163022] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Running Order Cart</h3>
                </div>
                {cartList.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-gray-400 hover:text-rose-400 underline"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {orderSuccess && (
                <div className="mb-4 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Order placed successfully!</span>
                </div>
              )}

              {/* Items in cart */}
              {cartList.length === 0 ? (
                <div className="my-16 text-center text-xs text-gray-500">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                  <span>Cart is empty. Tap any menu item to add.</span>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {cartList.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-[#0d2116] p-2.5 text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold text-white block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Rs. {item.sale_price} each
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center rounded-lg border border-emerald-900 bg-[#07130e]">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="px-2 py-0.5 text-gray-400 hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-1 text-xs font-bold text-amber-300">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={quantity >= item.stock}
                            className="px-2 py-0.5 text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-bold text-emerald-300 w-16 text-right">
                          Rs. {item.sale_price * quantity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Summary & Place Order */}
            {cartList.length > 0 && (
              <form onSubmit={handlePlaceOrder} className="mt-4 pt-4 border-t border-[#163022] space-y-3">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Subtotal</span>
                  <span>Rs. {subtotal}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Discount (Rs.)</span>
                  <input
                    type="number"
                    value={cartDiscount}
                    onChange={(e) => setCartDiscount(Number(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-[#1b3a2a] bg-[#0d1e15] px-2 py-0.5 text-right text-xs text-white"
                  />
                </div>

                <div className="flex justify-between text-sm font-black text-amber-300 border-t border-emerald-950 pt-2">
                  <span>Total Payable</span>
                  <span className="text-base font-extrabold text-amber-400">
                    Rs. {netTotal}
                  </span>
                </div>

                {/* Payment Option */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
                    Charge To
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {!isWalkin && (
                      <button
                        type="button"
                        onClick={() => setOrderPaymentMethod("bill")}
                        className={`rounded-xl border py-1.5 text-center text-xs font-bold ${
                          orderPaymentMethod === "bill"
                            ? "border-amber-500 bg-amber-950/40 text-amber-300"
                            : "border-emerald-950 bg-[#0d1e15] text-gray-400"
                        }`}
                      >
                        Player Bill Tab
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setOrderPaymentMethod("cash")}
                      className={`rounded-xl border py-1.5 text-center text-xs font-bold ${
                        orderPaymentMethod === "cash"
                          ? "border-amber-500 bg-amber-950/40 text-amber-300"
                          : "border-emerald-950 bg-[#0d1e15] text-gray-400"
                      }`}
                    >
                      Cash Drawer
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderPaymentMethod("online")}
                      className={`rounded-xl border py-1.5 text-center text-xs font-bold ${
                        orderPaymentMethod === "online"
                          ? "border-amber-500 bg-amber-950/40 text-amber-300"
                          : "border-emerald-950 bg-[#0d1e15] text-gray-400"
                      }`}
                    >
                      Online Transfer
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-950 shadow-lg shadow-amber-500/20 transition-all active:scale-98"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Place Order (Rs. {netTotal})</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: INVENTORY (ADMIN ONLY)
         ========================================================= */}
      {activeTab === "inventory" && isAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📦 Stock & Menu Catalog</span>
            </h2>
            <button
              onClick={() => setIsAddItemOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-950 shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Item</span>
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-900/40 bg-[#0a1811] p-5 shadow-xl">
            <div className="overflow-x-auto rounded-xl border border-emerald-950">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#091510] text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-emerald-950">
                  <tr>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Item Name</th>
                    <th className="py-3 px-3">Purchase Rs.</th>
                    <th className="py-3 px-3">Sale Rs.</th>
                    <th className="py-3 px-3">Profit Margin</th>
                    <th className="py-3 px-3">Stock Units</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/60 bg-[#07130e]">
                  {items.map((item) => {
                    const margin = item.sale_price - item.purchase_price;
                    const marginPct = Math.round(
                      (margin / (item.sale_price || 1)) * 100
                    );

                    return (
                      <tr key={item.id} className="hover:bg-[#0c1f15] transition-colors">
                        <td className="py-3 px-3 font-semibold text-gray-400">
                          {item.category}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-gray-300">
                          Rs. {item.purchase_price}
                        </td>
                        <td className="py-3 px-3 font-bold text-amber-300">
                          Rs. {item.sale_price}
                        </td>
                        <td className="py-3 px-3">
                          <span className="rounded bg-emerald-950 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-800 text-[10px]">
                            +Rs. {margin} ({marginPct}%)
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              item.stock <= 5 ? "text-rose-400" : "text-gray-200"
                            }`}
                          >
                            {item.stock} {item.stock <= 5 && "⚠️ Low"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedItemForRestock(item);
                              setIsRestockOpen(true);
                            }}
                            className="rounded-lg bg-emerald-800 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow"
                          >
                            Restock
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-1 text-rose-300 hover:bg-rose-900/50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: CASH COLLECT (ADMIN ONLY)
         ========================================================= */}
      {activeTab === "collect" && isAdmin && (
        <div className="max-w-xl mx-auto rounded-2xl border border-teal-500/40 bg-[#0a1811] p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 border-b border-[#163022] pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-950 border border-teal-800 text-teal-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Owner Cash Collect</h2>
              <p className="text-xs text-gray-400">
                Collect café shift cash drawer and log drawer reset
              </p>
            </div>
          </div>

          {collectSuccess && (
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Cash successfully collected and drawer cycle reset!</span>
            </div>
          )}

          <div className="rounded-xl border border-teal-900/40 bg-[#0d221c] p-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Uncollected Café Cash in Drawer
            </span>
            <span className="text-3xl font-black text-amber-400">
              Rs. {uncollectedCashTotal}
            </span>
            <p className="text-[11px] text-gray-400 mt-2">
              Based on today&apos;s cash café orders. Clicking Collect will log the owner cash pickup and mark those orders as collected.
            </p>
          </div>

          <button
            onClick={handleCashCollect}
            disabled={uncollectedCashTotal <= 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all disabled:opacity-40"
          >
            <Wallet className="h-4 w-4" />
            <span>Confirm Cash Collection (Rs. {uncollectedCashTotal})</span>
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Add Café Item</h2>
            <p className="text-xs text-gray-400 mb-4">
              Add item to menu catalog with pricing & initial inventory
            </p>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Karak Chai, Dunhill Switch"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as CafeCategory)}
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Beverages">Beverages</option>
                  <option value="Hot Drinks">Hot Drinks</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Cigarettes">Cigarettes</option>
                  <option value="Fast Food">Fast Food</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Purchase Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newItemPurchasePrice}
                    onChange={(e) => setNewItemPurchasePrice(Number(e.target.value) || "")}
                    placeholder="Cost"
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Sale Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItemSalePrice}
                    onChange={(e) => setNewItemSalePrice(Number(e.target.value) || "")}
                    placeholder="Price"
                    className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Initial Stock Units
                </label>
                <input
                  type="number"
                  min={0}
                  value={newItemStock}
                  onChange={(e) => setNewItemStock(Number(e.target.value) || "")}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-gray-950 shadow"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockOpen && selectedItemForRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-500/40 bg-[#0a1811] p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Restock Item</h2>
            <p className="text-xs text-gray-400 mb-3">
              Add inventory units for <strong className="text-white">{selectedItemForRestock.name}</strong>
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="rounded-xl bg-[#0d2116] p-3 text-xs flex justify-between">
                <span className="text-gray-400">Current Stock</span>
                <span className="font-bold text-white">{selectedItemForRestock.stock} units</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Units to Add *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value) || "")}
                  placeholder="e.g. 24"
                  className="w-full rounded-xl border border-[#1b3a2a] bg-[#0d1e15] px-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#163022]">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="rounded-xl border border-gray-800 bg-[#0c1812] px-4 py-2 text-xs text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-2 text-xs font-bold text-white shadow"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function CafePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading café workstation...</div>}>
      <CafeContent />
    </Suspense>
  );
}
