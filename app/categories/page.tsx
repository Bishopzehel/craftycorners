import Link from 'next/link';
const cats=[['Home Decor','Décor that brings warmth and personality.','home-decor'],['Jewellery','Little details, beautifully worn.','jewellery'],['Gifts','Thoughtful surprises for every occasion.','gifts']];
export default function Categories(){return <main className="inner-page"><p className="eyebrow">EXPLORE</p><h1>Shop by <em>category.</em></h1><div className="category-grid">{cats.map(([n,d,s])=><Link className="simple-panel category-tile" href={'/categories/'+s} key={s}><h2>{n} ↗</h2><p>{d}</p></Link>)}</div></main>}
