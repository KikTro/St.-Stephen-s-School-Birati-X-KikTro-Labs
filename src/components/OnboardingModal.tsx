import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
}

interface OnboardingModalProps {
  user: UserProfile;
  onComplete: (completedProfile: any) => void;
}

const PRESET_SKILLS = [
  "Python", "React", "CAD", "C++", "Machine Learning",
  "Robotics", "Computer Vision", "ROS", "TensorFlow",
  "3D Printing", "Arduino", "Raspberry Pi", "Next.js"
];

export default function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const [name, setName] = useState(user.name || "");
  const [className, setClassName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSkill = customSkill.trim();
    if (cleanSkill && !selectedSkills.includes(cleanSkill)) {
      setSelectedSkills([...selectedSkills, cleanSkill]);
      setCustomSkill("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !className || !rollNumber) {
      setError("Please fill in all required fields.");
      return;
    }
    if (selectedSkills.length === 0) {
      setError("Please select at least one skill.");
      return;
    }

    setLoading(false);
    setError("");

    const profileData = {
      uid: user.uid,
      name,
      email: user.email,
      photoURL: user.photoURL,
      class: className,
      rollNumber,
      skills: selectedSkills,
      onboarded: true,
      createdAt: new Date(),
    };

    try {
      setLoading(true);
      await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
      onComplete(profileData);
    } catch (err: any) {
      console.error("Error saving onboarding details:", err);
      setError("Failed to save profile. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-noise pointer-events-none"></div>

      <div className="relative w-full max-w-xl glass-panel brutal-border-lime p-8 text-white animate-fade-in">
        <h2 className="font-display text-2xl tracking-wider text-neonLime mb-2 text-center uppercase">
          COMPLETE YOUR PROFILE
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          Set up your student portfolio and join the St. Stephen's & KikTro Labs collaborative space.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile Picture display */}
          <div className="flex flex-col items-center mb-4">
            <img
              src={user.photoURL}
              alt="Google avatar"
              className="w-20 h-20 rounded-none border-2 border-neonLime shadow-neonGlow object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs text-gray-500 mt-2 font-mono">{user.email}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase font-display tracking-widest text-gray-400 mb-1">
                Name <span className="text-neonLime">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-[#161616] border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase font-display tracking-widest text-gray-400 mb-1">
                Class <span className="text-neonLime">*</span>
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Class XI-A"
                className="w-full bg-[#161616] border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-display tracking-widest text-gray-400 mb-1">
              Roll Number <span className="text-neonLime">*</span>
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 24"
              className="w-full bg-[#161616] border border-white/20 px-3 py-2 text-sm text-white focus:outline-none focus:border-neonLime focus:ring-1 focus:ring-neonLime"
              required
            />
          </div>

          {/* Skills Tagging System */}
          <div>
            <label className="block text-xs uppercase font-display tracking-widest text-gray-400 mb-2">
              Select Skills & Competencies <span className="text-neonLime">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1 text-xs font-mono border transition-all ${isSelected
                        ? "bg-neonLime text-black border-neonLime shadow-neonGlow font-semibold"
                        : "bg-transparent text-gray-400 border-white/10 hover:border-white/40 hover:text-white"
                      }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            {/* Custom Skills Adding */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Add other skill (e.g. OpenCV)"
                className="flex-1 bg-[#161616] border border-white/20 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-neonLime"
              />
              <button
                type="button"
                onClick={handleAddCustomSkill}
                className="px-4 bg-white text-black font-display font-bold text-xs uppercase border border-white hover:bg-neonLime hover:border-neonLime transition-all"
              >
                Add
              </button>
            </div>
            {selectedSkills.length > 0 && (
              <div className="mt-3">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-1">Your selection:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkills.map(skill => (
                    <span key={skill} className="px-2 py-0.5 bg-[#d9ff00]/10 border border-neonLime/30 text-neonLime text-[11px] font-mono rounded-sm flex items-center">
                      {skill}
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="ml-1.5 text-neonLime hover:text-white font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-neon py-3 mt-4 flex items-center justify-center text-sm font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "SAVING PORTFOLIO..." : "ACCESS PLATFORM →"}
          </button>
        </form>
      </div>
    </div>
  );
}
