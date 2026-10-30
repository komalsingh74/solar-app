"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";

import { makeStore } from "@/redux/store";
import AuthInitializer from "@/components/auth/AuthInitializer";
import ToastProvider from "@/components/providers/ToastProvider";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  // Keep route children in the first render so Next.js can validate their UI.
  // Each mounted provider owns its store; session restoration runs in an effect.
  const [store] = useState(makeStore);

  return (
    <Provider store={store}>
      <AuthInitializer />
      {children}
      <ToastProvider />
    </Provider>
  );
}
