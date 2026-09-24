import { Calendar1, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const BlogCard = ({ blog, large = false }) => {
  return (
    <Link
      to={`/blog/${blog.slug}`}
      className={`flex rounded-2xl overflow-hidden ${large ? "h-[300px] sm:h-[340px]" : "h-[180px] sm:h-[200px]"}`}
    >
      <div className="w-1/2 flex-shrink-0 cursor-pointer overflow-hidden">
        <img
          src={blog.img}
          alt={blog.title}
          className="w-full h-full object-cover object-top hover:scale-105 transition-all duration-300"
        />
      </div>
      <div
        className={`w-1/2 bg-[#eeeeee] flex flex-col justify-between ${large ? "p-8 gap-8" : "p-5 gap-4"}`}
      >
        <span className="inline-flex items-center self-start rounded-full border border-black/10 bg-white text-xs font-medium text-black shadow-sm overflow-hidden">
          <span className="px-3 py-1.5">{blog.category}</span>
        </span>
        <div className="flex flex-col gap-3">
          <h2
            className={` leading-tight text-black ${large ? "text-4xl font-medium" : "text-xl font-medium"}`}
          >
            {blog.title}
          </h2>
          {large && (
            <p className="text-sm text-black/60 leading-relaxed">{blog.desc}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-black/70">
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {blog.read}
          </span>
          <span>|</span>
          <span className="flex items-center gap-1.5">
            <Calendar1 size={14} /> {blog.date}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default BlogCard;
