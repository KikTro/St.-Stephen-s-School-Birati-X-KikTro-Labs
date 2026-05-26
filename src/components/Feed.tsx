import React, { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import PostCard, { Post } from "./PostCard";
import CreatePostModal from "./CreatePostModal";

interface FeedProps {
  currentUser: {
    uid: string;
    name: string;
    photoURL: string;
    class: string;
  };
  onSignOut: () => void;
}

const ALL_CATEGORIES = ["ALL", "AI", "Robotics", "ML", "Hardware", "Software", "IoT", "3D Modeling"];

export default function Feed({ currentUser, onSignOut }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "idea" | "project">("all");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to Posts collection in Realtime
  useEffect(() => {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const fetchedPosts: Post[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];
        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore loading error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtering Logic
  const filteredPosts = posts.filter((post) => {
    const matchesTab = activeTab === "all" || post.type === activeTab;
    const matchesCategory =
      activeCategory === "ALL" || post.categoryTags?.includes(activeCategory);
    return matchesTab && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background relative text-white flex flex-col font-sans">
      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-noise pointer-events-none z-0"></div>

      {/* Sticky Global Top Header (Mobile & Desktop) */}
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-b-2 border-white/10 px-4 md:px-8 py-3.5 flex justify-between items-center select-none shadow-md">
        <div className="flex items-center gap-3">
          {/* Brutalist Collab branding logo */}
          <div className="px-2.5 py-1 bg-neonLime text-black font-display font-black text-xs uppercase tracking-widest brutal-border-lime shadow-none">
            CORE
          </div>
          <span className="font-display font-bold text-[10px] md:text-xs tracking-widest text-white uppercase hidden sm:inline-block">
            ST. STEPHEN'S <span className="text-neonLime">×</span> KIKTRO LABS
          </span>
          <span className="font-display font-bold text-[10px] tracking-widest text-white uppercase sm:hidden">
            SSS <span className="text-neonLime">×</span> KIKTRO
          </span>
        </div>

        {/* User Navigation Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 bg-[#121212] border border-white/10 hover:border-neonLime/40 px-3 py-1.5 transition-all focus:outline-none"
          >
            <img
              src={currentUser.photoURL || "/avatar-placeholder.png"}
              alt={currentUser.name}
              className="w-6 h-6 rounded-none border border-neonLime object-cover"
            />
            <span className="text-xs font-mono font-bold tracking-wide max-w-[80px] md:max-w-[120px] truncate hidden xs:inline-block">
              {currentUser.name.split(" ")[0]}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-neonLime" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Premium Brutalist Dropdown Items */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#121212] border-2 border-white/20 brutal-border p-1 z-50 text-xs font-mono">
              <div className="px-3 py-2 border-b border-white/10 text-gray-400">
                <p className="text-white truncate font-bold text-[11px]">{currentUser.name}</p>
                <p className="text-[9px] text-neonLime uppercase tracking-wider mt-0.5">{currentUser.class || "CREATOR"}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setIsModalOpen(true);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-neonLime hover:text-black transition-colors uppercase font-bold text-[10px] tracking-wider"
              >
                + Create Pitch
              </button>
              <button
                onClick={onSignOut}
                className="w-full text-left px-3 py-2.5 text-red-400 hover:bg-red-500 hover:text-white transition-colors uppercase border-t border-white/5 font-bold text-[10px] tracking-wider"
              >
                Terminate Session
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto px-4 py-6 md:py-8 relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 flex-1">
        
        {/* Left Sidebar: Shown on Desktop, hidden on mobile */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 border border-white/10 text-center relative overflow-hidden group">
            {/* Background ambient glow effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-neonLime/5 rounded-full blur-2xl group-hover:bg-neonLime/10 transition-all duration-300"></div>

            <img
              src={currentUser.photoURL || "/avatar-placeholder.png"}
              alt={currentUser.name}
              className="w-20 h-20 rounded-none border-2 border-neonLime shadow-neonGlow mx-auto mb-4 object-cover"
            />
            <h2 className="font-display text-sm tracking-wider uppercase text-white truncate">
              {currentUser.name}
            </h2>
            <p className="text-xs font-mono text-neonLime mt-1 uppercase tracking-widest">
              {currentUser.class || "CREATOR"}
            </p>
            <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5 text-left text-xs font-mono text-gray-400">
              <div className="flex justify-between">
                <span>PORTFOLIOS:</span>
                <span className="text-white font-bold">{posts.filter(p => p.author.uid === currentUser.uid).length}</span>
              </div>
              <div className="flex justify-between">
                <span>REACTION XP:</span>
                <span className="text-white font-bold">1337</span>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="w-full mt-6 py-2 border border-white/30 hover:border-red-500 hover:text-red-400 transition-all font-mono text-[10px] tracking-widest uppercase"
            >
              [TERMINATE SESSION]
            </button>
          </div>

          {/* Quick Hub Partners Panel */}
          <div className="glass-panel p-6 border border-white/10 space-y-4">
            <h3 className="font-display text-xs tracking-widest text-neonLime uppercase">COLLABORATING HUBS</h3>
            <div className="space-y-3 font-mono text-xs text-gray-400">
              <div className="p-2.5 bg-black/40 border-l-2 border-white">
                <p className="text-white font-bold text-[11px] uppercase">ST. STEPHEN'S SCHOOL</p>
                <p className="text-[10px] text-gray-500">Birati, Kolkata</p>
              </div>
              <div className="p-2.5 bg-black/40 border-l-2 border-neonLime">
                <p className="text-white font-bold text-[11px] uppercase">KIKTRO LABS</p>
                <p className="text-[10px] text-gray-500">Hardware & AI Studio</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Side: Feed Stream (Occupies full space on Mobile, 3 cols on Desktop) */}
        <main className="col-span-1 lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="glass-panel p-6 md:p-8 border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="font-display text-lg sm:text-2xl tracking-widest text-white uppercase leading-tight">
                  St. Stephen's School, Birati <span className="text-neonLime">X</span> KikTro Labs
                </h1>
                <p className="text-[10px] md:text-xs font-mono text-gray-400 mt-2 tracking-wide uppercase">
                  Student innovation repository & collaborative maker arena
                </p>
              </div>

              {/* Hide direct button on mobile since we have the FAB */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="hidden sm:inline-flex btn-neon px-6 py-3 text-xs tracking-widest shadow-neonGlow whitespace-nowrap"
              >
                + NEW PITCH
              </button>
            </div>

            {/* Filters & Scrollable Categories Bar */}
            <div className="glass-panel p-3 md:p-4 border border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Feed Tabs Selector */}
              <div className="flex bg-[#121212] p-1 border border-white/10 w-full md:w-auto">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] md:text-xs font-display tracking-widest uppercase transition-all ${activeTab === "all" ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"
                    }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setActiveTab("idea")}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] md:text-xs font-display tracking-widest uppercase transition-all ${activeTab === "idea" ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"
                    }`}
                >
                  IDEAS
                </button>
                <button
                  onClick={() => setActiveTab("project")}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-[10px] md:text-xs font-display tracking-widest uppercase transition-all ${activeTab === "project" ? "bg-white text-black font-bold" : "text-gray-400 hover:text-white"
                    }`}
                >
                  PROJECTS
                </button>
              </div>

              {/* Swipeable Categories List (No-scrollbar style) */}
              <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 text-[10px] md:text-xs font-mono border whitespace-nowrap transition-all ${activeCategory === cat
                      ? "bg-neonLime text-black border-neonLime font-bold"
                      : "bg-transparent text-gray-500 border-white/10 hover:border-white/20 hover:text-white"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Posts Stream */}
            <div className="space-y-6">
              {loading ? (
                <div className="p-16 text-center">
                  <div className="w-10 h-10 border-2 border-dashed border-neonLime rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs font-mono uppercase tracking-widest text-neonLime animate-pulse">CONNECTING TO SHIELD GRID...</p>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="glass-panel p-16 text-center border border-white/5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-600 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <h3 className="font-display text-xs uppercase tracking-widest text-white">NO LOGS AVAILABLE</h3>
                  <p className="text-[10px] text-gray-500 font-mono mt-1">Be the catalyst and pitch your team or idea above.</p>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} currentUser={currentUser} />
                ))
              )}
            </div>
          </div>

          {/* Premium Brutalist Footer */}
          <footer className="glass-panel p-5 md:p-6 border border-white/10 mt-8 space-y-4 text-center font-mono select-none">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-gray-500 uppercase tracking-widest">
              <span className="font-bold tracking-wide">// ST. STEPHEN'S SCHOOL, BIRATI × KIKTRO LABS</span>
              <span className="text-[9px] md:text-[10px]">BUILT BY KRISHNENDU HALDER @KIKTRO // © 2026</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 text-[9px] md:text-[10px] text-gray-600 uppercase border-t border-white/5 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>FIREBASE DB: ACTIVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>CLOUDINARY CDN: ACTIVE</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <span>TOTAL POSTS: {posts.length}</span>
              </div>
            </div>
          </footer>
        </main>

      </div>

      {/* Floating Action Button (FAB) on Mobile viewports */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 lg:hidden z-30 btn-neon w-14 h-14 rounded-full flex items-center justify-center shadow-neonGlow text-3xl font-bold border-2 border-black"
        title="New Pitch"
      >
        +
      </button>

      {/* Write Post Modal */}
      {isModalOpen && (
        <CreatePostModal
          currentUser={currentUser}
          onClose={() => setIsModalOpen(false)}
          onPostCreated={() => { }}
        />
      )}
    </div>
  );
}
