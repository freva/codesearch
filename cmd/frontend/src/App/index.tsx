import '@mantine/core/styles.css';

import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { theme } from './styles/theme';
import { ErrorBoundary } from './error-boundary';
import { Search } from './pages/search';
import { File } from './pages/file';
import { Header } from './layout/header';

export default function App(): ReactNode {
  return (
    <BrowserRouter>
      <MantineProvider theme={theme}>
        <ErrorBoundary>
          <Header />
          <Routes>
            <Route path="/file/*" element={<File />} />
            <Route path="*" element={<Search />} />
          </Routes>
        </ErrorBoundary>
      </MantineProvider>
    </BrowserRouter>
  );
}
