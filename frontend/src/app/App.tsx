import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../shared/lib/queryClient';
import { AppRouter } from './Router';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}

export default App;
