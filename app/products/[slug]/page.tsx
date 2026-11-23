'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type Variant = { id: string; colour: string; sku: string | null; price: number | null; compare_at_price: number | null; stock: number; image_url: string | null; gallery_urls: string[] | null };
type Product = { id: string; name:string; slug:string; price:number; compare_at_price:number|null; description:string|null; image_url:string|null; gallery_urls:string[]|null; stock:number; sku:string|null };

export default function ProductPage() {
  const params = useParams<{slug:string}>();
  const [product,setProduct] = useState<Product|null>(null);
  const [variants,setVariants] = useState<Variant[]>([]);
  const [selectedVariant,setSelectedVariant] = useState<Variant|null>(null);
  const [selectedImage,setSelectedImage] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let active=true;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const {data,error}=await supabase.from('products').select('id,name,slug,price,compare_at_price,description,image_url,gallery_urls,stock,sku').eq('slug',params.slug).eq('status','published').maybeSingle();
      if(!active)return;
      if(error||!data){setProduct(null);setLoading(false);return;}
      const {data:variantData}=await supabase.from('product_variants').select('id,colour,sku,price,compare_at_price,stock,image_url,gallery_urls').eq('product_id',data.id).order('sort_order');
      if(active){
        setProduct(data);
        const availableVariants=(variantData||[]) as Variant[];
        setVariants(availableVariants);
        setSelectedVariant(availableVariants[0]||null);
        setSelectedImage(availableVariants[0]?.image_url||data.image_url||availableVariants[0]?.gallery_urls?.[0]||'');
        setLoading(false);
      }
    }
    load(); return ()=>{active=false;};
  },[params.slug]);
  const activePrice=selectedVariant?.price ?? product?.price ?? 0;
  const activeCompare=selectedVariant?.compare_at_price ?? product?.compare_at_price ?? null;
  const activeStock=selectedVariant ? selectedVariant.stock : product?.stock ?? 0;
  const activeSku=selectedVariant?.sku || product?.sku;
  const images=product?Array.from(new Set([selectedVariant?.image_url,selectedVariant?.gallery_urls?.[0],...(selectedVariant?.gallery_urls||[]),product.image_url,...(product.gallery_urls||[])].filter(Boolean) as string[])):[];
  function chooseVariant(variant:Variant){
    setSelectedVariant(variant);
    setSelectedImage(variant.image_url||variant.gallery_urls?.[0]||product?.image_url||'');
  }
  return <main className="inner-page product-detail-page"><p className="eyebrow">CRAFTYCORNERS · A THOUGHTFUL FIND</p>
    {loading?<p>Opening this piece…</p>:!product?<section className="simple-panel"><h1>Piece <em>not found.</em></h1><Link className="button-primary" href="/shop">Return to the collection →</Link></section>:<div className="detail-grid">
      <div><div className="detail-image">{selectedImage?<img src={selectedImage} alt={product.name+(selectedVariant?' - '+selectedVariant.colour:'')}/>:<span className="product-emoji">✳</span>}</div>
      {images.length>1&&<div className="product-thumbnails">{images.map((image,index)=><button className={selectedImage===image?'active':''} key={image} onClick={()=>setSelectedImage(image)} aria-label={'View product image '+(index+1)}><img src={image} alt=""/></button>)}</div>}</div>
      <section className="product-detail-copy"><p className="eyebrow">SELECTED BY CRAFTYCORNERS</p><h1>{product.name}</h1>
      {variants.length>0&&<div className="variant-picker"><p><strong>Colour:</strong> {selectedVariant?.colour}</p><div className="variant-options">{variants.map(variant=><button type="button" key={variant.id} className={selectedVariant?.id===variant.id?'selected':''} disabled={variant.stock<=0} onClick={()=>chooseVariant(variant)} aria-pressed={selectedVariant?.id===variant.id}>{variant.colour}{variant.stock<=0?' · Sold out':''}</button>)}</div></div>}
      <div className="detail-prices"><strong>₹{Number(activePrice).toLocaleString('en-IN')}</strong>{activeCompare&&activeCompare>activePrice&&<del>₹{Number(activeCompare).toLocaleString('en-IN')}</del>}</div>
      <p className="detail-description">{product.description||'A thoughtful handcrafted find from Craftycorners.'}</p>
      <p className="stock-note">{activeStock>0?'Available · '+activeStock+' in stock':'Currently unavailable'}</p>
      <a className="button-primary" href={'mailto:info@craftycorners.in?subject='+encodeURIComponent('Order enquiry: '+product.name+(selectedVariant?' - '+selectedVariant.colour:''))}>Enquire to order ↗</a>
      <p className="product-code">{activeSku?'Product code: '+activeSku:'From our hands to your home.'}</p><Link className="text-link" href="/shop">← Back to the collection</Link></section>
    </div>}
  </main>;
}
