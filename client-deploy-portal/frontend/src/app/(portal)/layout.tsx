'use client';

import { AppShell } from '@/components/layout/AppShell';
import { ReactNode } from 'react';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
