import Link from 'next/link';
export default function Cart(){return <main className="inner-page"><p className="eyebrow">YOUR BAG</p><h1>Your bag of <em>lovely things.</em></h1><section className="simple-panel"><p>Your cart will be shared across pages in the next shopping-cart integration.</p><Link className="primary" href="/shop">Continue shopping →</Link></section></main>}
