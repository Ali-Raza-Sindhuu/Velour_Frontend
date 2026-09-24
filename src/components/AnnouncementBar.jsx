export default function AnnouncementBar({
  message = "🎉 Up to 50% Off on Your Favorite Styles!",
}) {
  return (
    <div className="w-full bg-[#111111] text-white text-center py-2.5 text-sm tracking-wide">
      {message}
    </div>
  );
}
