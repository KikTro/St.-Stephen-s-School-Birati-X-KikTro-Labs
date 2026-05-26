import React, { useState, useEffect, useRef } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface Comment {
  id: string;
  parentId: string | null;
  author: {
    uid: string;
    name: string;
    photoURL: string;
  };
  content: string;
  createdAt: any;
}

export interface Post {
  id: string;
  type: "idea" | "project";
  author: {
    uid: string;
    name: string;
    photoURL: string;
    class: string;
  };
  content: string;
  categoryTags: string[];
  lookingForTeam?: boolean;
  media?: { url: string; type: "image" | "video"; name: string }[];
  heartedBy?: string[];
  upvotedBy?: string[];
  downvotedBy?: string[];
  createdAt: any;
}

interface PostCardProps {
  post: Post;
  currentUser: {
    uid: string;
    name: string;
    photoURL: string;
  };
}

export default function PostCard({ post, currentUser }: PostCardProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  // Reaction States
  const hearts = post.heartedBy || [];
  const upvotes = post.upvotedBy || [];
  const downvotes = post.downvotedBy || [];

  const hasHearted = hearts.includes(currentUser.uid);
  const hasUpvoted = upvotes.includes(currentUser.uid);
  const hasDownvoted = downvotes.includes(currentUser.uid);

  // Threaded Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);

  // Media Lazy Loading Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "200px" } // trigger load slightly before it scrolls fully into view
    );

    if (mediaRef.current) {
      observer.observe(mediaRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Fetch Comments in Realtime
  useEffect(() => {
    if (!showComments) return;

    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];
      setComments(fetched);
    });

    return () => unsubscribe();
  }, [showComments, post.id]);

  // Handle Reactions
  const handleReaction = async (type: "heart" | "upvote" | "downvote") => {
    const postRef = doc(db, "posts", post.id);

    try {
      if (type === "heart") {
        await updateDoc(postRef, {
          heartedBy: hasHearted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        });
      } else if (type === "upvote") {
        // Remove downvote if upvoting
        await updateDoc(postRef, {
          upvotedBy: hasUpvoted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
          ...(hasDownvoted && { downvotedBy: arrayRemove(currentUser.uid) }),
        });
      } else if (type === "downvote") {
        // Remove upvote if downvoting
        await updateDoc(postRef, {
          downvotedBy: hasDownvoted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
          ...(hasUpvoted && { upvotedBy: arrayRemove(currentUser.uid) }),
        });
      }
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        parentId: replyToId,
        content: newComment,
        author: {
          uid: currentUser.uid,
          name: currentUser.name,
          photoURL: currentUser.photoURL,
        },
        createdAt: new Date(),
      };

      await addDoc(collection(db, "posts", post.id, "comments"), commentData);
      setNewComment("");
      setReplyToId(null);
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  // Render Post Content & Format Code Blocks
  const formatPostContent = (text: string) => {
    if (!text) return null;

    // Check for code blocks using ```language\n[code]\n```
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        // It's a code block
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : "code";
        const code = match ? match[2] : part.slice(3, -3);

        return (
          <div key={index} className="my-4 border border-white/20 relative group">
            <div className="flex items-center justify-between px-4 py-1.5 bg-[#121212] border-b border-white/20 text-xs font-mono font-bold text-neonLime uppercase">
              <span>{lang || "source code"}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-white transition-colors duration-150"
              >
                COPY CODE
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm code-block font-mono leading-relaxed max-h-[350px]">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Regular text block - style paragraphs and simple formatting
      return (
        <p key={index} className="whitespace-pre-wrap text-gray-300 text-sm md:text-base leading-relaxed my-2">
          {part}
        </p>
      );
    });
  };

  // Humanize Timestamp
  const formatTime = (ts: any) => {
    if (!ts) return "Just now";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Separate parent and reply comments
  const parentComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="glass-panel w-full p-4 md:p-6 border-b-2 border-white/10 hover:border-neonLime/40 transition-all duration-300 relative flex flex-col">
      {/* Post Type & Status Badges - responsive layout prevents overlap with header */}
      <div className="sm:absolute sm:top-6 sm:right-6 flex items-center gap-2 mb-3 sm:mb-0 order-first sm:order-none self-start sm:self-auto select-none">
        {post.type === "idea" && post.lookingForTeam && (
          <span className="animate-pulse bg-neonLime/10 border border-neonLime text-neonLime text-[9px] md:text-[10px] tracking-widest uppercase font-display font-semibold px-2 py-0.5 shadow-neonGlow">
            LFW (TEAM)
          </span>
        )}
        <span className={`text-[9px] md:text-[10px] font-display font-bold tracking-widest px-2.5 py-0.5 border ${post.type === "project"
          ? "bg-white text-black border-white"
          : "bg-transparent text-gray-400 border-white/20"
          } uppercase`}>
          {post.type}
        </span>
      </div>

      {/* Author Header */}
      <div className="flex items-center gap-3.5 mb-5">
        <img
          src={post.author.photoURL || "/avatar-placeholder.png"}
          alt={post.author.name}
          className="w-10 h-10 md:w-11 md:h-11 border border-white/30 object-cover rounded-none"
        />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white hover:text-neonLime transition-colors cursor-pointer text-sm">
              {post.author.name}
            </h3>
            <span className="text-[9px] md:text-[10px] text-gray-500 font-mono">
              ({post.author.class})
            </span>
          </div>
          <p className="text-[10px] md:text-[11px] text-gray-500 font-mono mt-0.5">
            {formatTime(post.createdAt)}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-6 space-y-3 font-sans">
        {formatPostContent(post.content)}
      </div>

      {/* Lazy-Loaded Media Container */}
      {post.media && post.media.length > 0 && (
        <div ref={mediaRef} className="my-6 bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center relative min-h-[180px] md:min-h-[220px] w-full">
          {isIntersecting ? (
            post.media.map((file, i) => {
              // Check if it is a Google Drive URL or a standard public/Cloudinary URL
              const isDriveUrl = file.url.includes("drive.google.com") || file.url.includes("docs.google.com");

              if (isDriveUrl) {
                const driveIdMatch = file.url.match(/[?&]id=([a-zA-Z0-9-_]+)/) || file.url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
                const driveId = driveIdMatch ? driveIdMatch[1] : "";

                if (!driveId) return null;

                return (
                  <div key={i} className="w-full h-full flex flex-col justify-center items-center">
                    {file.type === "image" ? (
                      <img
                        src={`https://drive.google.com/thumbnail?sz=w1200&id=${driveId}`}
                        alt={file.name}
                        className="max-h-[300px] md:max-h-[480px] w-auto max-w-full object-contain select-none shadow-md"
                        loading="lazy"
                      />
                    ) : (
                      <iframe
                        src={`https://drive.google.com/file/d/${driveId}/preview`}
                        className="w-full h-[320px] md:h-[400px] border-none bg-[#050505]"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      ></iframe>
                    )}
                  </div>
                );
              }

              // Otherwise: direct Cloudinary URL or direct standard web URL
              return (
                <div key={i} className="w-full h-full flex flex-col justify-center items-center p-2">
                  {file.type === "image" ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="max-h-[300px] md:max-h-[480px] w-auto max-w-full object-contain select-none shadow-md"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      src={file.url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full max-h-[320px] md:max-h-[400px] bg-[#050505] object-contain border border-white/5"
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
              {/* Spinner & Placeholder */}
              <div className="w-8 h-8 border-2 border-dashed border-neonLime rounded-full animate-spin mb-3"></div>
              <span className="text-xs font-mono uppercase tracking-widest">
                SCROLL TO LOAD MEDIA ({post.media[0].type})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Category Tags */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {post.categoryTags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 bg-[#161616] text-gray-400 text-xs font-mono border border-white/5">
            #{tag.toLowerCase()}
          </span>
        ))}
      </div>

      {/* Interaction & Reaction Bar */}
      <div className="flex items-center justify-between border-t border-b border-white/10 py-3 mb-4">
        <div className="flex items-center gap-6">
          {/* Heart Button */}
          <button
            onClick={() => handleReaction("heart")}
            className={`flex items-center gap-1.5 text-xs font-mono transition-all ${hasHearted ? "text-red-500 scale-110 font-bold" : "text-gray-400 hover:text-red-400"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={hasHearted ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            <span>{hearts.length}</span>
          </button>

          {/* Upvote Button */}
          <button
            onClick={() => handleReaction("upvote")}
            className={`flex items-center gap-1.5 text-xs font-mono transition-all ${hasUpvoted ? "text-neonLime scale-110 font-bold" : "text-gray-400 hover:text-neonLime"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={hasUpvoted ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
            <span>{upvotes.length}</span>
          </button>

          {/* Downvote Button */}
          <button
            onClick={() => handleReaction("downvote")}
            className={`flex items-center gap-1.5 text-xs font-mono transition-all ${hasDownvoted ? "text-orange-500 scale-110 font-bold" : "text-gray-400 hover:text-orange-400"
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill={hasDownvoted ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
            <span>{downvotes.length}</span>
          </button>
        </div>

        {/* Comment count toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.749-2.54C3 16.825 2 14.732 2 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <span>DISCUSSION ({comments.length || "EXPAND"})</span>
        </button>
      </div>

      {/* Expanded Threaded Discussion Area */}
      {showComments && (
        <div className="mt-4 border-l border-white/10 pl-4 py-2 space-y-4 animate-fade-in">
          {/* Main Comment input */}
          <form onSubmit={handleAddComment} className="flex gap-2 items-end">
            <div className="flex-1">
              {replyToId && (
                <div className="flex items-center justify-between bg-white/5 px-3 py-1 text-xs text-neonLime font-mono mb-1 rounded-sm border-l border-neonLime">
                  <span>Replying to {comments.find(c => c.id === replyToId)?.author.name}</span>
                  <button type="button" onClick={() => setReplyToId(null)} className="text-gray-400 hover:text-white font-bold">×</button>
                </div>
              )}
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyToId ? "Type your reply..." : "Write a constructive feedback..."}
                className="w-full bg-[#121212] border border-white/20 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
              />
            </div>
            <button
              type="submit"
              className="bg-white text-black px-4 py-2 hover:bg-neonLime font-display text-xs uppercase font-bold border border-white hover:border-neonLime transition-all"
            >
              SEND
            </button>
          </form>

          {/* Comment Threading List */}
          <div className="space-y-4 mt-4 max-h-[380px] overflow-y-auto pr-1">
            {parentComments.length === 0 ? (
              <p className="text-gray-600 text-xs font-mono text-center py-4">NO THOUGHTS YET. BE THE FIRST TO CHIME IN.</p>
            ) : (
              parentComments.map((parent) => (
                <div key={parent.id} className="group border-b border-white/5 pb-3">
                  <div className="flex items-start gap-3">
                    <img src={parent.author.photoURL} alt={parent.author.name} className="w-8 h-8 object-cover border border-white/10" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{parent.author.name}</span>
                        <span className="text-[9px] text-gray-500 font-mono">{formatTime(parent.createdAt)}</span>
                      </div>
                      <p className="text-gray-300 text-xs mt-1 leading-relaxed">{parent.content}</p>

                      <button
                        onClick={() => setReplyToId(parent.id)}
                        className="text-[10px] font-mono text-neonLime hover:text-white transition-colors mt-2"
                      >
                        REPLY
                      </button>

                      {/* Render Replies */}
                      <div className="mt-3 pl-6 border-l-2 border-white/5 space-y-3">
                        {getReplies(parent.id).map((child) => (
                          <div key={child.id} className="flex items-start gap-2.5">
                            <img src={child.author.photoURL} alt={child.author.name} className="w-6 h-6 object-cover border border-white/10" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-white">{child.author.name}</span>
                                <span className="text-[9px] text-gray-500 font-mono">{formatTime(child.createdAt)}</span>
                              </div>
                              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{child.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
