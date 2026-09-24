export default function AnnouncementBar({ message = "🎉 Up to 50% Off on Your Favorite Styles!" }) {
  return <div className="w-full bg-[#111111] py-2.5 text-center text-sm tracking-wide text-white">{message}</div>;
}
