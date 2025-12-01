'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSession } from 'next-auth/react';

export function AgentLayoutClient({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        role="AGENT" 
        userEmail={session?.user?.email}
        userName={session?.user?.name}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}









