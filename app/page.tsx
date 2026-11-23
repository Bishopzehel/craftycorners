'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  stock: number;
  categories?: { name: string; slug: string } | null;
};

const collections = [
  { name: 'Home Decor', slug: 'home-decor', note: 'Objects that make a space feel like yours', number: '01' },
  { name: 'Jewellery', slug: 'jewellery', note: 'Little details with a lot of character', number: '02' },
  { name: 'Gifts', slug: 'gifts', note: 'Thoughtful gestures, beautifully wrapped', number: '03' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState('All');

  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      if (!supabase) { setLoading(false); return; }
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,price,compare_at_price,image_url,stock,categories(name,slug)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(8);
      if (mounted) {
        if (!error) setProducts((data || []) as Product[]);
        setLoading(false);
      }
    }
    loadProducts();
    return () => { mounted = false; };
  }, []);

  const visibleProducts = useMemo(() => activeCollection === 'All'
    ? products
    : products.filter((product) => product.categories?.slug === activeCollection), [products, activeCollection]);

  return (
    <main className="premium-home">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">CRAFTED WITH CHARACTER · CURATED WITH CARE</p>
          <h1>Make room for<br /><em>the meaningful.</em></h1>
          <p className="hero-intro">Discover handcrafted home accents, expressive jewellery and thoughtful gifts — chosen to bring a little more beauty to the everyday.</p>
          <div className="hero-actions">
            <Link className="button-primary" href="/shop">Explore the collection <span>↗</span></Link>
            <Link className="text-link" href="/about">The Craftycorners story</Link>
          </div>
          <div className="hero-signoff"><span className="signoff-line" /> From our hands to your home.</div>
        </div>
        <div className="hero-composition" aria-label="Craftycorners curated collection">
          <div className="hero-image-frame">
            {products.find((product) => product.image_url)?.image_url
              ? <img src={products.find((product) => product.image_url)!.image_url!} alt="A featured handcrafted piece from Craftycorners" />
              : <div className="hero-image-placeholder"><span className="placeholder-orbit">✳</span><span>Objects with a story</span></div>}
          </div>
          <div className="hero-stamp"><span>THE ART OF</span><strong>thoughtful<br />living</strong><span>CRAFTYCORNERS · EST. WITH LOVE</span></div>
          <div className="hero-caption">A collection of little<br />things that feel like you.</div>
        </div>
      </section>

      <section className="brand-values" aria-label="Our values">
        <span>Thoughtfully selected</span><i>✳</i><span>Made to be treasured</span><i>✳</i><span>From our hands to your home</span>
      </section>

      <section className="collection-section section-wrap">
        <div className="section-heading">
          <div><p className="eyebrow">A PLACE FOR EVERY KIND OF LOVELY</p><h2>Explore our <em>collections.</em></h2></div>
          <Link className="text-link" href="/categories">View all categories ↗</Link>
        </div>
        <div className="collection-grid">
          {collections.map((collection, index) => (
            <Link className={'collection-card collection-card-' + (index + 1)} href={'/categories/' + collection.slug} key={collection.slug}>
              <span className="collection-number">{collection.number} / COLLECTION</span>
              <span className="collection-symbol">{index === 0 ? '⌂' : index === 1 ? '◇' : '✳'}</span>
              <span className="collection-card-bottom"><strong>{collection.name}</strong><small>{collection.note}</small><b>Explore ↗</b></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <div className="section-wrap">
          <div className="section-heading">
            <div><p className="eyebrow">THE GOOD THINGS</p><h2>Find your next <em>favourite.</em></h2></div>
            <Link className="text-link" href="/shop">Shop everything ↗</Link>
          </div>
          <div className="catalogue-toolbar">
            <div className="filter-tabs">
              <button className={activeCollection === 'All' ? 'selected' : ''} onClick={() => setActiveCollection('All')}>All finds</button>
              {collections.map((collection) => <button key={collection.slug} className={activeCollection === collection.slug ? 'selected' : ''} onClick={() => setActiveCollection(collection.slug)}>{collection.name}</button>)}
            </div>
            <span className="catalogue-count">{products.length} {products.length === 1 ? 'piece' : 'pieces'}</span>
          </div>
          {loading ? <div className="catalogue-empty">Curating the collection…</div> : visibleProducts.length === 0 ? (
            <div className="catalogue-empty">
              <span className="empty-flower">✳</span>
              <h3>{products.length ? 'More lovely things await.' : 'Our shelves are being filled.'}</h3>
              <p>{products.length ? 'There are no published pieces in this collection just yet.' : 'New finds will appear here as soon as they are added to the Craftycorners studio.'}</p>
              <Link className="text-link" href="/shop">Visit the shop ↗</Link>
            </div>
          ) : (
            <div className="premium-products">
              {visibleProducts.slice(0, 4).map((product) => (
                <article className="premium-product" key={product.id}>
                  <Link href={'/products/' + product.slug} className="premium-product-image">
                    {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <span className="product-placeholder">✳</span>}
                    {product.stock <= 0 && <span className="product-ribbon">Currently unavailable</span>}
                    <span className="product-view">View piece ↗</span>
                  </Link>
                  <div className="premium-product-info"><div><p>{product.categories?.name || 'CRAFTYCORNERS EDIT'}</p><h3>{product.name}</h3></div><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong></div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="story-banner">
        <div className="story-mark">C<span>.</span></div>
        <div><p className="eyebrow">A LITTLE MORE ABOUT US</p><h2>Not just things.<br /><em>Things with feeling.</em></h2><p>We believe the pieces we live with should mean something. Craftycorners brings together thoughtful finds, handcrafted details and gifts worth remembering.</p><Link className="button-light" href="/about">Get to know us ↗</Link></div>
      </section>

      <section className="newsletter-note"><p className="eyebrow">A NOTE FROM OUR CORNER</p><h2>Good things are <em>worth discovering.</em></h2><p>Follow the little details, new arrivals and stories behind the things we love.</p><a className="text-link" href="https://www.instagram.com/craftycorners.in/" target="_blank" rel="noreferrer">Find us on Instagram ↗</a></section>
    </main>
  );
}
