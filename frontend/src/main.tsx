import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/lib/react-query';
import { AuthProvider } from './app/AuthProvider';
import { WorkspaceProvider } from './features/workspaces/context/WorkspaceProvider';
import { ToastProvider } from './shared/hooks/ToastProvider';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <App />
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);