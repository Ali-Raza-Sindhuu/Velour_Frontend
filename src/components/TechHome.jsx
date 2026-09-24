import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react";
import SampleProduct from "./SampleProduct";
import { resolveImg } from "../utils/resolveImg";

const collections = [
  { title: "Women", subtitle: "Modern essentials", query: "women", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85" },
  { title: "Men", subtitle: "Everyday, elevated", query: "men", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85" },
  { title: "New arrivals", subtitle: "Just landed", query: "new-arrivals", image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85" },
];

export default function TechHome() {
  const products = useSelector((state) => state.products?.items || []);
  const lead = products[0];
  const picks = products.slice(0, 8);
  const heroImage = resolveImg(lead?.image_url || lead?.images?.[0]) || "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1600&q=90";
  return <div className="fashion-home">
    <section className="fashion-hero page-x"><div className="page-inner fashion-hero-grid">
      <div className="fashion-hero-copy"><span className="fashion-kicker"><Sparkles size={14}/> The new season edit</span><h1>Wear your<br/>own <em>story.</em></h1><p>Considered pieces for every day, made to move with your life and your style.</p><Link to="/shops" className="fashion-button">Explore the collection <ArrowRight size={16}/></Link><span className="fashion-side-note">SPRING / SUMMER — 2026</span></div>
      <div className="fashion-hero-image"><img src={heroImage} alt={lead?.name || "New season clothing collection"}/><div className="fashion-image-caption"><span>THE LATEST EDIT</span><b>{lead?.name || "A fresh point of view"}</b></div></div>
    </div></section>
    <section className="fashion-categories page-x"><div className="page-inner"><div className="fashion-heading"><span>FIND YOUR FIT</span><h2>Shop the collections</h2><p>Pieces worth reaching for, day after day.</p></div><div className="fashion-category-grid">{collections.map((item, i) => <Link key={item.title} to={`/shops?category=${encodeURIComponent(item.query)}`} className={`fashion-category fashion-category-${i+1}`}><img src={item.image} alt={`${item.title} clothing collection`} loading="lazy"/><span className="fashion-category-copy"><small>{item.subtitle}</small><b>{item.title}<ArrowRight size={17}/></b></span></Link>)}</div></div></section>
    <section className="fashion-products page-x"><div className="page-inner"><div className="fashion-products-heading"><div className="fashion-heading"><span>MADE FOR RIGHT NOW</span><h2>New & noteworthy</h2></div><Link className="fashion-underlink" to="/shops">Shop all <ArrowRight size={15}/></Link></div>{picks.length ? <div className="fashion-product-grid">{picks.map((product) => <SampleProduct key={product.id || product.slug} {...product}/>)}</div> : <div className="fashion-empty">Our new collection is on its way. <Link to="/shops">Explore the store <ChevronRight size={15}/></Link></div>}</div></section>
    <section className="fashion-story page-x"><div className="page-inner fashion-story-grid"><div className="fashion-story-image"><img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85" alt="A considered everyday look" loading="lazy"/></div><div className="fashion-story-copy"><span>THE ALMINA POINT OF VIEW</span><h2>Less, but<br/><em>better.</em></h2><p>We believe getting dressed should feel effortless. Thoughtful shapes, tactile fabrics and versatile pieces make a wardrobe that feels like you.</p><Link to="/about" className="fashion-button">Our story <ArrowRight size={16}/></Link><div className="fashion-stat-row"><div><b>01</b><span>Wear on repeat</span></div><div><b>∞</b><span>Ways to make it yours</span></div><div><b>100%</b><span>Made for real life</span></div></div></div></div></section>
    <section className="fashion-note page-x"><div className="page-inner"><span>ALMINA / CLOTHING</span><p>GOOD CLOTHES.<br/>GOOD DAYS.</p><Link to="/shops">Find your next favourite <ArrowRight size={15}/></Link></div></section>
  </div>;
}



