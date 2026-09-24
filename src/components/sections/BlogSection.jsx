import { Calendar1, Clock, Handshake } from "lucide-react";
import SectionHeader from "../SectionHeader";

const blog1 = "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1200&q=85";
const blog2 = "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85";
const blog3 = "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85";

const BlogSection = () => {
  return ( 
    <section className="page-section flex w-full flex-col gap-10 bg-[#f8f8f8]">
      <div className="page-inner flex flex-col gap-10">
      <SectionHeader
  badge="IT Store Journal"
  icon={<Handshake size={13} />}
  heading="Explore your fragrance journey"
  ctaLabel="Read all blogs"
  ctaLink="/blog"
/>

      {/* Blog Card */}
      <div className="h-[400px] flex rounded-2xl overflow-hidden">
        
        {/* Image — takes up half */}
        <div className="w-1/2 flex-shrink-0 cursor-pointer overflow-hidden">
          <img src={blog1} alt="Blog cover" className="w-full h-full object-cover object-top hover:scale-105  transition-all duration-300" />
        </div>

        {/* Content — sits flush against the image */}
        <div className="w-1/2 bg-[#eeeeee] p-8 flex flex-col gap-8 justify-between">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white text-xs font-medium text-black shadow-sm overflow-hidden">
              <span className="px-3 py-1.5">Style Guide</span>
            </span>
          <div className="flex flex-col gap-4">
            <h2 className="text-4xl font-semibold leading-tight tracking-wide text-black">
              How to find your signature scent
            </h2>
            <p className="text-sm text-black/60 leading-relaxed max-w-100">
              Learn how fragrance families and notes can guide you to a scent that feels unmistakably yours.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-black">
            <span className="flex items-center gap-1.5"><Clock size={16}/> 8 min read</span>
            <span>|</span>
            <span className="flex items-center gap-1.5"><Calendar1 size={16}/> Jan 29, 2026</span>
          </div>
        </div>

      </div>

      <div className="flex items-center justify-center gap-3">
         <div className="h-[200px] flex rounded-2xl overflow-hidden">
        
        {/* Image — takes up half */}
        <div className="w-1/2 flex-shrink-0 cursor-pointer overflow-hidden">
          <img src={blog2} alt="Blog cover" className="w-full h-full object-cover object-top hover:scale-105  transition-all duration-300" />
        </div>

        {/* Content — sits flush against the image */}
        <div className="w-1/2 bg-[#eeeeee] p-5 flex flex-col gap-4 justify-between">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white text-xs font-medium text-black shadow-sm overflow-hidden">
              <span className="px-3 py-1.5">Fragrance Tips</span>
            </span>
            <h2 className="text-xl font-semibold leading-tight tracking-wide text-black">
Make your fragrance last longer            </h2>
          

          <div className="flex items-center gap-2 text-sm text-black/70">
            <span className="flex items-center "><Clock size={16}/> 8 min read</span>
            <span>|</span>
            <span className="flex items-center"><Calendar1 size={16}/> 12/30/2026</span>
          </div>
        </div>

      </div>

      <div className="h-[200px] flex rounded-2xl overflow-hidden">
        
        {/* Image — takes up half */}
        <div className="w-1/2 flex-shrink-0 cursor-pointer overflow-hidden">
          <img src={blog3} alt="Blog cover" className="w-full h-full object-cover object-top hover:scale-105  transition-all duration-300" />
        </div>

        {/* Content — sits flush against the image */}
        <div className="w-1/2 bg-[#eeeeee] p-5 flex flex-col gap-4 justify-between">
        <span className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white text-xs font-medium text-black shadow-sm overflow-hidden">
              <span className="px-3 py-1.5">Style Guide</span>
            </span>
            <h2 className="text-xl font-semibold leading-tight tracking-wide text-black">
Understanding fragrance notes
            </h2>
          

          <div className="flex items-center gap-2 text-sm text-black/70">
            <span className="flex items-center gap-1"><Clock size={16}/> 5 min read</span>
            <span>|</span>
            <span className="flex items-center gap-1"><Calendar1 size={16}/> 11/22/2026</span>
          </div>
        </div>

      </div>
      </div>
      </div>

    </section>
  )
}

export default BlogSection
