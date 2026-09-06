import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  product_id: string;
  name: string;
  sku?: string;
  seller_id: string;
  seller_name: string;
  base_price: number;
  proposed_price: number;
  quantity: number;
  stock_quantity: number;
  unit: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity' | 'proposed_price'> & { quantity?: number; proposed_price?: number }) => void;
  removeFromCart: (product_id: string) => void;
  updateCartItem: (product_id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartBySeller: Record<string, { seller_name: string; items: CartItem[] }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('dealflow_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('dealflow_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  const addToCart = (product: Omit<CartItem, 'quantity' | 'proposed_price'> & { quantity?: number; proposed_price?: number }) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product_id === product.product_id);
      const defaultQty = product.quantity || 1;
      const defaultPrice = product.proposed_price || Math.round(product.base_price * 0.9);

      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        updated[existingIdx] = {
          ...current,
          quantity: current.quantity + defaultQty,
        };
        return updated;
      }

      return [
        ...prev,
        {
          ...product,
          quantity: defaultQty,
          proposed_price: defaultPrice,
        },
      ];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (product_id: string) => {
    setCartItems((prev) => prev.filter((i) => i.product_id !== product_id));
  };

  const updateCartItem = (product_id: string, updates: Partial<CartItem>) => {
    setCartItems((prev) =>
      prev.map((item) => (item.product_id === product_id ? { ...item, ...updates } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Group items by seller_id
  const cartBySeller: Record<string, { seller_name: string; items: CartItem[] }> = {};
  cartItems.forEach((item) => {
    const sId = item.seller_id || 'seller-default';
    if (!cartBySeller[sId]) {
      cartBySeller[sId] = { seller_name: item.seller_name || 'Verified Seller', items: [] };
    }
    cartBySeller[sId].items.push(item);
  });

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        cartBySeller,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
