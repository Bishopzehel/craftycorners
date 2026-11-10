'use client';
import { useMemo, useState } from 'react';

const products = [
 {id:1,name:'Hand-painted Floral Wall Plate',category:'Home Decor',price:799,tag:'Bestseller',emoji:'🌼',bg:'#f4e6d8',desc:'A vibrant handcrafted accent for your walls.'},
 {id:2,name:'Boho Beaded Statement Necklace',category:'Jewellery',price:649,tag:'New',emoji:'📿',bg:'#eadfe8',desc:'Artisan-inspired detail for everyday elegance.'},
 {id:3,name:'Bamboo Art Wall Hanging',category:'Home Decor',price:1199,tag:'Handmade',emoji:'🎋',bg:'#e3eadc',desc:'Natural textures, made to bring warmth home.'},
 {id:4,name:'Little Moments Gift Box',category:'Gifts',price:549,tag:'Gift pick',emoji:'🎁',bg:'#f2dfd5',desc:'A thoughtful surprise for someone special.'},
 {id:5,name:'Evil Eye Bracelet',category:'Jewellery',price:299,tag:'Popular',emoji:'🧿',bg:'#dce9ed',desc:'A minimal charm with a meaningful touch.'},
 {id:6,name:'Handcrafted Ceramic Planter',category:'Home Decor',price:899,tag:'Artisan made',emoji:'🪴',bg:'#e9e2d4',desc:'Give your favourite corner a little life.'}
];
export default function Home(){
 const [cart,setCart]=useState<Record<number,number>>({});
 const [category,setCategory]=useState('All');
 const [query,setQuery]=useState('');
 const [chatOpen,setChatOpen]=useState(false);
 const [chat,setChat]=useState('');
 const [messages,setMessages]=useState<string[]>(['Hi! I’m your Craftycorners shopping assistant. Tell me what you’re looking for ✨']);
 const count=Object.values(cart).reduce((a,b)=>a+b,0);
 const total=products.reduce((s,p)=>s+p.price*(cart[p.id]||0),0);
 const shown=useMemo(()=>products.filter(p=>(category==='All'||p.category===category)&&p.name.toLowerCase().includes(query.toLowerCase())),[category,query]);
 function add(id:number){setCart(c=>({...c,[id]:(c[id]||0)+1}));}
 function send(){if(!chat.trim())return;setMessages(m=>[...m,'You: '+chat,'Demo assistant: I can help you discover products. In the live version, I’ll search our catalogue and recommend exact items.']);setChat('');}
 return <main>
  <div className="announcement">Thoughtful finds, handcrafted with love · Free shipping on orders over ₹1,499</div>
  <header className="nav"><a className="brand" href="/"><span className="brandmark">c</span> craftycorners<span className="dot">.</span></a><nav><a href="/shop">Shop</a><a href="/categories">Categories</a><a href="/about">Our story</a><a href="/contact">Contact</a></nav><button className="cart" onClick={()=>document.getElementById('cart')?.scrollIntoView({behavior:'smooth'})}>Bag ({count})</button></header>
  <section className="hero"><div className="hero-copy"><p className="eyebrow">MADE WITH MEANING</p><h1>Little things.<br/><em>Beautifully</em> made.</h1><p>Discover handcrafted home décor, jewellery and gifts that make everyday moments feel special.</p><a className="primary" href="/shop">Explore the collection <span>↗</span></a><div className="trust"><span>✳ Thoughtfully curated</span><span>✳ Artisan-inspired</span></div></div><div className="hero-art"><div className="sun"></div><div className="art-card art-one">✿<small>made by hand</small></div><div className="art-card art-two">♡</div><div className="art-caption">Objects with a story</div></div></section>
  <section className="categories"><div><small>SHOP BY MOOD</small><h2>Find your kind of lovely.</h2></div><div className="cat-pills">{['All','Home Decor','Jewellery','Gifts'].map(c=><button className={category===c?'active':''} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div></section>
  <section id="shop" className="shop"><div className="shop-head"><div><p className="eyebrow">THE COLLECTION</p><h2>Made to be <em>loved.</em></h2></div><input aria-label="Search products" placeholder="Search the collection…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="products">{shown.map(p=><article className="product" key={p.id}><div className="product-image" style={{background:p.bg}}><span className="tag">{p.tag}</span><span className="product-emoji">{p.emoji}</span><button className="quick-add" onClick={()=>add(p.id)}>＋ Add</button></div><div className="product-meta"><div><h3>{p.name}</h3><p>{p.category}</p></div><strong>₹{p.price.toLocaleString('en-IN')}</strong></div><p className="desc">{p.desc}</p></article>)}</div>{shown.length===0&&<p className="empty">No products found. Try another search.</p>}</section>
  <section id="story" className="story"><div className="story-symbol">✳</div><div><p className="eyebrow">A LITTLE ABOUT US</p><h2>From our hands<br/>to <em>your home.</em></h2><p>We believe the most meaningful things are the ones made with care. Craftycorners brings together handcrafted details, joyful gifts and everyday pieces with personality.</p></div><div className="story-note">Small joys.<br/><em>Big heart.</em></div></section>
  <section id="cart" className="cart-section"><div><p className="eyebrow">YOUR BAG</p><h2>A few lovely things.</h2></div><div className="cart-box">{count===0?<p>Your bag is waiting for something lovely.</p>:products.filter(p=>cart[p.id]).map(p=><div className="cart-row" key={p.id}><span>{p.emoji} {p.name} × {cart[p.id]}</span><strong>₹{(p.price*cart[p.id]).toLocaleString('en-IN')}</strong><button onClick={()=>setCart(c=>({...c,[p.id]:Math.max(0,(c[p.id]||0)-1)}))}>−</button><button onClick={()=>add(p.id)}>＋</button></div>)}<div className="cart-total"><span>Subtotal</span><strong>₹{total.toLocaleString('en-IN')}</strong></div><button className="primary checkout" disabled={!count} onClick={()=>alert('Checkout integration will be connected in the next build.')}>Continue to checkout →</button><small>Secure payments and shipping will be connected next.</small></div></section>
  <footer><a className="brand" href="#"><span className="brandmark">c</span> craftycorners<span className="dot">.</span></a><span>Handmade happiness, delivered.</span><span>© Craftycorners</span></footer>
  <button className="ai-fab" onClick={()=>setChatOpen(!chatOpen)}>✦ Ask Crafty AI</button>
  {chatOpen&&<aside className="chat-panel"><div className="chat-head"><div><b>Crafty AI</b><small>Your personal shopping helper</small></div><button onClick={()=>setChatOpen(false)}>×</button></div><div className="chat-messages">{messages.map((m,i)=><p key={i}>{m}</p>)}</div><form onSubmit={e=>{e.preventDefault();send()}}><input value={chat} onChange={e=>setChat(e.target.value)} placeholder="What are you shopping for?"/><button>↑</button></form><small className="demo-note">Preview mode · AI API not connected yet</small></aside>}
 </main>
}
