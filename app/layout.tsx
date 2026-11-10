import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Craftycorners | Handmade for your home', description: 'Handcrafted decor, jewellery and thoughtful gifts.' };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
