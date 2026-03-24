import { ReactNode, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function AppLayout({ children, title, selectedMonth, onMonthChange }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader title={title} selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
          <main className="flex-1 overflow-auto p-5 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
