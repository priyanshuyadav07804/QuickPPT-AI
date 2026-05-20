import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const notoDevanagari = Noto_Sans_Devanagari({ 
  subsets: ['devanagari', 'latin'], 
  variable: '--font-hindi',
  weight: ['400', '500', '700']
});

export const metadata: Metadata = {
  title: 'QuickPPT AI | PDF to PowerPoint Question Generator',
  description: 'Transform PDF question papers into beautifully formatted PowerPoint presentations in seconds with AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoDevanagari.variable} dark`}>
      <body suppressHydrationWarning className="font-sans min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
          <Toaster position="top-center" theme="dark" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
