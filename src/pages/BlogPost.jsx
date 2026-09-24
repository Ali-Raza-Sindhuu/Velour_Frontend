import { Link, useParams } from "react-router-dom";
import { Calendar1, Clock, ArrowLeft } from "lucide-react";
import { blogs, getBlogBySlug } from "../data/blogs";

const BlogPost = () => {
  const { slug } = useParams();
  const post = getBlogBySlug(slug);

  if (!post) {
    return (
      <section className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-white text-center">
        <p className="text-lg font-semibold text-black">Post not found</p>
        <Link to="/blog" className="text-sm text-black/60 underline">
          Back to journal
        </Link>
      </section>
    );
  }

  const related = blogs.filter((b) => b.slug !== post.slug).slice(0, 3);

  return (
    <article className="bg-white">
      {/* Cover */}
      <div className="relative -mt-16 flex min-h-[100dvh] w-full items-end overflow-hidden md:-mt-20">
        <img src={post.img} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(5,5,5,0.35) 0%, rgba(5,5,5,0.75) 100%)" }}
        />
        <div className="page-x relative z-10 w-full pb-14">
          <div className="page-inner max-w-3xl text-left">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
              {post.category}
            </span>
            <h1 className="mt-6 font-display text-pretty text-[clamp(2.1rem,4.6vw,4.25rem)] font-medium leading-[1.08] tracking-[-0.025em] text-white">
              {post.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Meta + body */}
      <div className="page-section">
      <div className="page-inner max-w-3xl">
        <Link to="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-black/50 hover:text-black">
          <ArrowLeft size={15} /> Back to journal
        </Link>

        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-black/10 pb-6 text-sm text-black/60">
          <span>By {post.author}</span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {post.read}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar1 size={14} /> {post.date}
          </span>
        </div>

        <div className="flex flex-col gap-5">
          {post.content.map((paragraph, i) => (
            <p key={i} className="text-[16px] leading-relaxed text-black/75">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
      </div>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="page-section bg-[#f8f8f8]">
          <div className="page-inner">
            <h2 className="mb-8 font-display text-[clamp(2rem,4vw,3.25rem)] font-medium tracking-tight text-black">More from the journal</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {related.map((b) => (
                <Link key={b.slug} to={`/blog/${b.slug}`} className="group flex flex-col gap-3">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl">
                    <img
                      src={b.img}
                      alt={b.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <p className="text-sm font-medium leading-snug text-black group-hover:underline">
                    {b.title}
                  </p>
                  <p className="text-xs text-black/45">{b.read}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
};

export default BlogPost;
