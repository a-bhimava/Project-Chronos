"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export const TenantContext = createContext<{
  tenantId: string | undefined;
  setTenantId: (id: string | undefined) => void;
}>({
  tenantId: undefined,
  setTenantId: () => {},
});

export function useTenant() {
  return useContext(TenantContext);
}
