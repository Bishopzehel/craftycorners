'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string; description: string | null };
type Product = { id: string; name: string; slug: string; price: number; image_url: string | null; stock: number };

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: collection } = await supabase.from('categories').select('id,name,description').eq('slug', slug).maybeSingle();
      if (!active) return;
      setCategory(collection);
      if (collection) {
        const { data } = await supabase.from('products').select('id,name,slug,price,image_url,stock').eq('category_id', collection.id).eq('status', 'published').order('created_at', { ascending: false });
        if (active) setProducts(data || []);
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [slug]);

  return <main className="inner-page">
    <p className="eyebrow">THE CRAFTYCORNERS COLLECTION</p>
    {loading ? <p>Opening the collection…</p> : !category ? <><h1>Collection <em>not found.</em></h1><Link className="text-link" href="/categories">Explore all collections →</Link></> : <>
      <h1>{category.name} <em>collection.</em></h1><p>{category.description || 'Thoughtful pieces, selected with care.'}</p>
      {!products.length ? <section className="simple-panel"><h2>Something lovely is on its way.</h2><p>We are preparing this collection. Check back soon.</p><Link className="text-link" href="/shop">Browse all products →</Link></section> :
        <div className="products">{products.map(product => <article className="product" key={product.id}>
          <Link href={'/products/' + product.slug}><div className="product-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <span className="product-emoji">✳</span>}</div></Link>
          <div className="product-meta"><h3>{product.name}</h3><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong></div>
          <Link className="text-link" href={'/products/' + product.slug}>Discover this piece →</Link>
        </article>)}</div>}
    </>}
  </main>;
}
