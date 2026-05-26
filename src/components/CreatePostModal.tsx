import React, { useState, useRef } from "react";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebase";

interface CreatePostModalProps {
  currentUser: {
    uid: string;
    name: string;
    photoURL: string;
    class: string;
  };
  onClose: () => void;
  onPostCreated: () => void;
}

const CATEGORY_OPTIONS = ["AI", "Robotics", "ML", "Hardware", "Software", "IoT", "3D Modeling"];

export default function CreatePostModal({ currentUser, onClose, onPostCreated }: CreatePostModalProps) {
  const [postType, setPostType] = useState<"idea" | "project">("idea");
  const [content, setContent] = useState("");
  const [lookingForTeam, setLookingForTeam] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [mediaFile, setMediaFile] = useState<{ url: string; type: "image" | "video"; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle Category tag
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Quick insertion tool for formatting
  const insertText = (before: string, after: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = textarea.value.substring(start, end);
    const replacement = before + (selection || "code_here") + after;

    setContent(
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end)
    );

    // Refocus & reset cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selection || "code_here").length);
    }, 50);
  };

  // Handle media selection & Google Drive API upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (150MB)
    const MAX_SIZE_MB = 150;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Media uploads must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setError("");
    const fileType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : null;
    if (!fileType) {
      setError("Unsupported file format. Please upload an image or video.");
      return;
    }

    setUploadProgress(10);
    try {
      // 1. Read file locally as a base64 Data URL
      setUploadProgress(20);
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      // 2. Transmit to server-side Next.js secure Service Account upload API with progress feedback
      setUploadProgress(40);
      const uploadData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.setRequestHeader("Content-Type", "application/json");

        // Dynamically compute progress bar based on base64 stream uploads
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            // Map the percentage from 40% up to 95%
            setUploadProgress(40 + Math.round((percentage / 100) * 55));
          }
        });

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(new Error("Failed to parse server upload response."));
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText);
              reject(new Error(errData.error || "Server upload failed."));
            } catch {
              reject(new Error(`Server transmission failed: HTTP ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => reject(new Error("Network connection error during server upload."));
        xhr.send(
          JSON.stringify({
            name: file.name,
            type: file.type,
            postType: postType,
            base64: base64String
          })
        );
      });

      setMediaFile({
        url: uploadData.url,
        type: fileType,
        name: file.name
      });
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(null), 800);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to transmit file to the server. Please retry.");
      setUploadProgress(null);
    }
  };


  // Submit Post to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please write some content or instructions.");
      return;
    }
    if (selectedTags.length === 0) {
      setError("Please pick at least one category tag.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const postData = {
        type: postType,
        author: {
          uid: currentUser.uid,
          name: currentUser.name,
          photoURL: currentUser.photoURL,
          class: currentUser.class || "Student"
        },
        content,
        categoryTags: selectedTags,
        createdAt: new Date(),
        heartedBy: [],
        upvotedBy: [],
        downvotedBy: [],
        ...(postType === "idea" && { lookingForTeam }),
        ...(mediaFile && { media: [mediaFile] })
      };

      await addDoc(collection(db, "posts"), postData);
      onPostCreated();
      onClose();
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError("Failed to create post. Try checking your Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4 py-8 overflow-y-auto">
      <div className="absolute inset-0 bg-noise pointer-events-none"></div>

      <div className="relative w-full max-w-2xl glass-panel brutal-border p-6 md:p-8 text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-lg md:text-xl tracking-wider text-white uppercase">
            CREATE NEW PITCH
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-neonLime transition-colors text-xl font-bold font-mono"
          >
            [CLOSE]
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Post Type Selector tabs */}
          <div className="flex border border-white/20">
            <button
              type="button"
              onClick={() => setPostType("idea")}
              className={`flex-1 py-3 text-xs font-display tracking-widest uppercase transition-all ${postType === "idea" ? "bg-white text-black font-bold" : "bg-[#121212] text-gray-400 hover:text-white"
                }`}
            >
              Idea & Pitch
            </button>
            <button
              type="button"
              onClick={() => setPostType("project")}
              className={`flex-1 py-3 text-xs font-display tracking-widest uppercase transition-all ${postType === "project" ? "bg-white text-black font-bold" : "bg-[#121212] text-gray-400 hover:text-white"
                }`}
            >
              Completed Project
            </button>
          </div>

          {/* Looking for Team toggler - Ideas only */}
          {postType === "idea" && (
            <div className="flex items-center justify-between p-3 bg-[#121212] border border-white/10">
              <div>
                <h4 className="text-xs uppercase font-display tracking-widest text-white">Looking for Teammates?</h4>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">Show a dynamic badge that you are actively seeking creators.</p>
              </div>
              <button
                type="button"
                onClick={() => setLookingForTeam(!lookingForTeam)}
                className={`w-12 h-6 border transition-all relative flex items-center ${lookingForTeam ? "bg-neonLime border-neonLime justify-end" : "bg-transparent border-white/30 justify-start"
                  }`}
              >
                <div className={`w-4 h-4 mx-1 transition-all ${lookingForTeam ? "bg-black" : "bg-white/70"}`}></div>
              </button>
            </div>
          )}

          {/* Clickable category fields */}
          <div>
            <label className="block text-xs uppercase font-display tracking-widest text-gray-400 mb-2">
              Select Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3.5 py-1.5 text-xs font-mono border transition-all ${isSelected
                        ? "bg-neonLime text-black border-neonLime font-bold shadow-neonGlow"
                        : "bg-transparent text-gray-400 border-white/20 hover:border-white/40 hover:text-white"
                      }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rich Content Editor Textarea & format toolbar */}
          <div>
            <div className="flex items-center justify-between bg-[#121212] border-t border-l border-r border-white/20 px-2 py-1">
              {/* Text formatting shortcuts */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => insertText("**", "**")}
                  className="px-2 py-1 text-xs font-mono font-bold hover:text-neonLime text-gray-400"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => insertText("*", "*")}
                  className="px-2 py-1 text-xs font-mono italic hover:text-neonLime text-gray-400"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => insertText("```python\n", "\n```")}
                  className="px-2.5 py-1 text-xs font-mono hover:text-neonLime text-neonLime border border-neonLime/20 bg-neonLime/5"
                  title="Paste Code Block"
                >
                  [+ CODE BLOCK]
                </button>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">Supports Markdown & Code formatting</span>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === "idea"
                  ? "Pitch your AI or Robotics idea. Describe the mission, the hardware you need, and what skills you are looking for..."
                  : "Showcase your masterpiece. List the hardware used, software stacks built, CAD files designed, and paste key code blocks..."
              }
              rows={8}
              className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm text-white focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime font-sans"
              required
            />
          </div>

          {/* Media upload container */}
          <div>
            <label className="block text-xs uppercase font-display tracking-widest text-gray-400 mb-2">
              Attach Demonstration Video or Render Image (Max 150MB)
            </label>

            {uploadProgress !== null ? (
              <div className="border border-dashed border-neonLime p-6 text-center bg-neonLime/5">
                <div className="w-full bg-[#161616] h-2.5 mb-2 overflow-hidden relative">
                  <div
                    className="bg-neonLime h-full transition-all duration-200 shadow-neonGlow"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs font-mono text-neonLime tracking-widest animate-pulse">
                  UPLOADING STUFF TO STORAGE: {uploadProgress}%
                </span>
              </div>
            ) : mediaFile ? (
              <div className="border border-white/20 p-4 bg-[#121212] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="px-2.5 py-1.5 bg-white/5 border border-white/10 text-xs font-mono text-gray-300">
                    {mediaFile.type.toUpperCase()}
                  </div>
                  <span className="text-xs text-gray-300 font-mono truncate max-w-[280px]">
                    {mediaFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMediaFile(null)}
                  className="text-red-400 hover:text-red-500 font-mono text-xs uppercase"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 hover:border-neonLime/50 hover:bg-white/[0.02] p-8 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 mx-auto text-gray-500 mb-2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-white uppercase font-display tracking-wider">Drag & drop or Click to choose media</p>
                <p className="text-[10px] text-gray-500 font-mono mt-1">Accepts images & raw videos up to 150MB</p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 border border-white text-white font-display text-xs uppercase font-bold hover:bg-white hover:text-black transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadProgress !== null}
              className="flex-1 btn-neon py-3.5 flex items-center justify-center text-xs tracking-widest disabled:opacity-50"
            >
              {loading ? "TRANSMITTING..." : "PUBLISH CREATION →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
