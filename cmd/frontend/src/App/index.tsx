import '@mantine/core/styles.css';
import './styles/index.css';

import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { theme } from './styles/theme';
import { ErrorBoundary } from './error-boundary';
import { Search } from './pages/search';
import { File } from './pages/file';
import { Header } from './layout/header';
import { SearchContextProvider } from './pages/store';
import { KeyboardShortcuts } from './pages/keyboard/keyboard-shortcuts';

export default function App(): ReactNode {
  return (
    <BrowserRouter>
      <MantineProvider theme={theme}>
        <ErrorBoundary>
          <SearchContextProvider>
            <KeyboardShortcuts />
            <Header />
            <Routes>
              <Route path="/file/*" element={<File />} />
              <Route path="*" element={<Search />} />
            </Routes>
          </SearchContextProvider>
        </ErrorBoundary>
      </MantineProvider>
    </BrowserRouter>
  );
}
