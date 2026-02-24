import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { VisualLayout } from './components/VisualLayout';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './providers/AuthProvider';
import { UIProvider } from './providers/UIProvider';
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { Footer } from './components/Footer';
import Script from 'next/script';

// Optimize font loading
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'iComly - Real-time Celebrity Intelligence',
  description: 'Global celebrity news, sightings, and real-time noise tracking system. Access exclusive scoops and community broadcasts.',
  openGraph: {
    title: 'iComly - Real-time Celebrity Intelligence',
    description: 'Track the worlds biggest stars in real-time. Exclusive news, sightings, and community alerts.',
    url: 'https://icomly.com',
    siteName: 'iComly',
    images: [
      {
        url: 'https://icomly.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'iComly Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iComly - Real-time Celebrity Intelligence',
    description: 'Global celebrity news and sightings tracker.',
    images: ['https://icomly.com/og-image.jpg'],
  },
  other: {
    'google-adsense-account': 'ca-pub-7873079521814069',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7873079521814069"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
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
            <ConfirmationModal />
          </UIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}