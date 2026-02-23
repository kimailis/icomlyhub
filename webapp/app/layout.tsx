import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { VisualLayout } from './components/VisualLayout';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './providers/AuthProvider';
import { UIProvider } from './providers/UIProvider';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { Footer } from './components/Footer';

// Optimize font loading
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Icomly - Celebrity Tracking',
  description: 'Real-time celebrity news and sightings tracker.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AuthProvider>
          <UIProvider>
            <VisualLayout>
              {children}
            </VisualLayout>
            <Navbar />
            <Footer />
            <AuthModal />
            <ProfileModal />
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}