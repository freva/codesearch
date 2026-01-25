import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './error-boundary';
import { Search } from './pages/search';
import { File } from './pages/file';
import { Header } from './layout/header';
import { SearchContextProvider } from './pages/store';
import { KeyboardShortcuts } from './pages/keyboard/keyboard-shortcuts';
import { Footer } from './layout/footer';

export default function App(): ReactNode {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <SearchContextProvider>
          <KeyboardShortcuts />
          <Header />
          <Routes>
            <Route path="/file/*" element={<File />} />
            <Route path="*" element={<Search />} />
          </Routes>
          <Footer />
        </SearchContextProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
