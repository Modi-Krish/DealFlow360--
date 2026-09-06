import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../shared/lib/queryClient';
import { AppRouter } from './Router';
import { useAuthStore } from '../shared/store/authStore';
import { CartProvider } from '../shared/context/CartContext';

function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <AppRouter />
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
