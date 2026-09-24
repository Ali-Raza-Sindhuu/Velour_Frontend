import { useState } from "react";
import { motion } from "framer-motion";

const StyleCard = ({ card }) => {
  const { style01, style02, title, description, features } = card;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="bg-white flex-1 rounded-xl overflow-hidden flex flex-col min-w-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-[220px] sm:h-[240px] md:h-[260px] flex items-center justify-center overflow-hidden">
        <motion.div
          className="absolute w-[100px] h-[140px] sm:w-[115px] sm:h-[155px] md:w-[130px] md:h-[170px] rounded-2xl overflow-hidden border-2 border-white"
          animate={{
            rotate: hovered ? -14 : -10,
            scale: hovered ? 1.05 : 1,
            y: hovered ? -6 : 0,
            x: -32,
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.13)", zIndex: 2 }}
        >
          <img src={style01} alt="" className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          className="absolute w-[100px] h-[140px] sm:w-[115px] sm:h-[155px] md:w-[130px] md:h-[170px] rounded-2xl overflow-hidden border-2 border-white"
          animate={{
            rotate: hovered ? 14 : 10,
            scale: hovered ? 1.05 : 1,
            y: hovered ? -6 : 0,
            x: 32,
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.13)", zIndex: 1 }}
        >
          <img src={style02} alt="" className="w-full h-full object-cover" />
        </motion.div>
      </div>

      <div className="flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 md:p-2">
        <h3 className="border-b border-black/10 font-semibold text-black text-lg sm:text-xl md:text-[24px] pb-2">
          {title}
        </h3>

        <p className="text-sm sm:text-base md:text-[16px] max-w-full md:max-w-[380px] text-black/70 leading-relaxed">
          {description}
        </p>

       <div className="inline-flex  items-center gap-2">
  {features.map(({ icon: Icon, content }, index) => (
    <span
      key={index}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#eeeeee] px-2.5 py-1 text-[12px] font-semibold text-black/90 sm:text-[13px]"
    >
      <Icon size={12} />
      {content}
    </span>
  ))}
</div>
      </div>
    </div>
  );
};

export default StyleCard;