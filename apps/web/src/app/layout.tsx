import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'UNO Online — Play with Friends',
  description:
    "Play UNO online with friends — no account needed. Classic, Flip, and Show 'Em No Mercy variants.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='14' fill='%23E8362A'/><text x='50' y='72' text-anchor='middle' font-size='52' font-weight='900' fill='white' font-family='Arial Black,Arial'>UNO</text></svg>",
        type: 'image/svg+xml',
      },
    ],
  },
  openGraph: {
    title: 'UNO Online — Play with Friends',
    description: 'Free multiplayer UNO — Classic, Flip, and Mercy variants. No sign-up required.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
          richColors
        />
      </body>
    </html>
  );
}
