import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClientDeploy Portal',
  description: 'Secure client deployment and hosting management portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-50 dark:bg-surface-950 antialiased">
        {children}
      </body>
    </html>
  );
}
