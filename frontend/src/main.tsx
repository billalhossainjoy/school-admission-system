import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'

import { routeTree } from "./routeTree.gen";
import { AppProviders } from './providers/AppProviders';

const router = createRouter({
  routeTree
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>  
      <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
