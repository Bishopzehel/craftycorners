import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Craftycorners | From our hands to your home',
  description: 'Discover handcrafted home décor, jewellery and thoughtful gifts, curated with care by Craftycorners.',
  metadataBase: new URL('https://www.craftycorners.in'),
  openGraph: { title: 'Craftycorners', description: 'From our hands to your home.', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="announcement">Thoughtful finds, handcrafted with love · Discover something meaningful</div>
        <header className="nav">
          <Link className="brand" href="/" aria-label="Craftycorners home"><img className="site-logo" src="/craftycorners-logo.svg" alt="Craftycorners Handcrafted" /></Link>
          <nav aria-label="Main navigation">
            <Link href="/shop">Shop</Link><Link href="/categories">Collections</Link><Link href="/about">Our story</Link><Link href="/contact">Contact</Link><Link href="/faq">Help</Link>
          </nav>
          <Link className="cart" href="/cart">Your bag</Link>
        </header>
        {children}
        <footer>
          <Link className="brand" href="/"><span className="brandmark">c</span> craftycorners<span className="dot">.</span></Link>
          <span>From our hands to your home.</span>
          <span>© {new Date().getFullYear()} Craftycorners</span>
        </footer>
      </body>
    </html>
  );
}
