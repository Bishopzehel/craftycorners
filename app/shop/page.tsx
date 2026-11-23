'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Product = { id: string; name: string; slug: string; price: number; description: string | null; image_url: string | null; stock: number; categories?: { name: string; slug: string }[] | null };
type Category = { id: string; name: string; slug: string };

export default function Shop() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); setError('The product catalogue is being connected. Please check back soon.'); return; }
      const [{ data: products, error: productError }, { data: categoryData }] = await Promise.all([
        supabase.from('products').select('id,name,slug,price,description,image_url,stock,categories(name,slug)').eq('status', 'published').order('created_at', { ascending: false }),
        supabase.from('categories').select('id,name,slug').order('sort_order'),
      ]);
      if (!active) return;
      if (productError) setError(productError.message);
      setItems((products || []) as Product[]);
      setCategories(categoryData || []);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const shown = useMemo(() => items.filter(item =>
    (category === 'all' || item.categories?.[0]?.slug === category) &&
    (item.name.toLowerCase().includes(search.toLowerCase()) || (item.description || '').toLowerCase().includes(search.toLowerCase()))
  ), [items, category, search]);

  return (
    <main className="inner-page shop-page">
      <p className="eyebrow">THE CRAFTYCORNERS COLLECTION</p>
      <h1>Good things, <em>gathered.</em></h1>
      <p>Handcrafted home accents, jewellery and thoughtful gifts, selected to bring character to your everyday.</p>
      <div className="shop-controls">
        <div className="filter-tabs"><button className={category === 'all' ? 'selected' : ''} onClick={() => setCategory('all')}>Everything</button>{categories.map(item => <button key={item.id} className={category === item.slug ? 'selected' : ''} onClick={() => setCategory(item.slug)}>{item.name}</button>)}</div>
        <input aria-label="Search products" placeholder="Search the collection…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <p>Curating the collection…</p> : error ? <section className="simple-panel"><h2>Our collection is getting ready.</h2><p>{error}</p></section> : shown.length === 0 ? <section className="simple-panel"><h2>No pieces found.</h2><p>Try another search or explore a different collection.</p></section> : (
        <div className="products">{shown.map(product => <article className="product" key={product.id}>
          <Link href={'/products/' + product.slug}><div className="product-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <span className="product-emoji">✳</span>}</div></Link>
          <div className="product-meta"><div><p>{product.categories?.[0]?.name || 'Craftycorners'}</p><h3>{product.name}</h3></div><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong></div>
          <Link className="text-link" href={'/products/' + product.slug}>Discover this piece →</Link>
        </article>)}</div>
      )}
    </main>
  );
}
