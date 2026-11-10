import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'Craftycorners | Handmade for your home', description: 'Handcrafted decor, jewellery and thoughtful gifts.' };
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body><div className="announcement">Thoughtful finds, handcrafted with love · Free shipping on orders over ₹1,499</div><header className="nav"><Link className="brand" href="/"><img className="site-logo" src="/craftycorners-logo.svg" alt="Craftycorners Handcrafted"/></Link><nav><Link href="/shop">Shop</Link><Link href="/categories">Categories</Link><Link href="/about">Our story</Link><Link href="/contact">Contact</Link><Link href="/faq">Help</Link></nav><Link className="cart" href="/cart">Bag</Link></header>{children}<footer><Link className="brand" href="/"><span className="brandmark">c</span> craftycorners<span className="dot">.</span></Link><span>Handmade happiness, delivered.</span><span>© Craftycorners</span></footer></body></html>;
}