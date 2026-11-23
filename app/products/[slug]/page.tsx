'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Product = { name:string; slug:string; price:number; compare_at_price:number|null; description:string|null; image_url:string|null; gallery_urls:string[]|null; stock:number; sku:string|null };

export default function ProductPage() {
  const params = useParams<{slug:string}>();
  const [product,setProduct] = useState<Product|null>(null);
  const [selectedImage,setSelectedImage] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let active=true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const {data}=await supabase.from('products').select('name,slug,price,compare_at_price,description,image_url,gallery_urls,stock,sku').eq('slug',params.slug).eq('status','published').maybeSingle();
      if(active){setProduct(data);setSelectedImage(data?.image_url||data?.gallery_urls?.[0]||'');setLoading(false);}
    }
    load(); return ()=>{active=false;};
  },[params.slug]);
  const images=product?Array.from(new Set([product.image_url,...(product.gallery_urls||[])].filter(Boolean) as string[])):[];
  return <main className="inner-page product-detail-page"><p className="eyebrow">CRAFTYCORNERS · A THOUGHTFUL FIND</p>
    {loading?<p>Opening this piece…</p>:!product?<section className="simple-panel"><h1>Piece <em>not found.</em></h1><Link className="button-primary" href="/shop">Return to the collection →</Link></section>:<div className="detail-grid">
      <div><div className="detail-image">{selectedImage?<img src={selectedImage} alt={product.name}/>:<span className="product-emoji">✳</span>}</div>
      {images.length>1&&<div className="product-thumbnails">{images.map((image,index)=><button className={selectedImage===image?'active':''} key={image} onClick={()=>setSelectedImage(image)} aria-label={'View product image '+(index+1)}><img src={image} alt=""/></button>)}</div>}</div>
      <section className="product-detail-copy"><p className="eyebrow">SELECTED BY CRAFTYCORNERS</p><h1>{product.name}</h1>
      <div className="detail-prices"><strong>₹{Number(product.price).toLocaleString('en-IN')}</strong>{product.compare_at_price&&product.compare_at_price>product.price&&<del>₹{Number(product.compare_at_price).toLocaleString('en-IN')}</del>}</div>
      <p className="detail-description">{product.description||'A thoughtful handcrafted find from Craftycorners.'}</p>
      <p className="stock-note">{product.stock>0?'Available · '+product.stock+' in stock':'Currently unavailable'}</p>
      <a className="button-primary" href={'mailto:info@craftycorners.in?subject='+encodeURIComponent('Order enquiry: '+product.name)}>Enquire to order ↗</a>
      <p className="product-code">{product.sku?'Product code: '+product.sku:'From our hands to your home.'}</p><Link className="text-link" href="/shop">← Back to the collection</Link></section>
    </div>}
  </main>;
}
