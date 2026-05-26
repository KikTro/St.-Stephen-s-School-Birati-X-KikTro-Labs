import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../lib/firebase";
import OnboardingModal from "../components/OnboardingModal";
import Feed from "../components/Feed";

interface AppUserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  class: string;
  rollNumber: string;
  skills: string[];
  onboarded: boolean;
}

export default function Home() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      if (user) {
        setFirebaseUser(user);
        // Check Firestore if profile is completed
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists() && userSnap.data().onboarded) {
            setUserProfile(userSnap.data() as AppUserProfile);
            setOnboardingOpen(false);
          } else {
            // Needs onboarding
            setOnboardingOpen(true);
          }
        } catch (err) {
          console.error("Error reading user profile:", err);
          setOnboardingOpen(true); // Default to onboarding modal if database check fails
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        setOnboardingOpen(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Authentication trigger
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        localStorage.setItem("google_access_token", token);
      }
    } catch (err) {
      console.error("Sign in failed:", err);
      setAuthLoading(false);
    }
  };

  // Sign out trigger
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("google_access_token");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (completedProfile: AppUserProfile) => {
    setUserProfile(completedProfile);
    setOnboardingOpen(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative text-white">
        <div className="absolute inset-0 bg-noise pointer-events-none"></div>
        <div className="w-12 h-12 border-2 border-t-neonLime border-white/20 rounded-full animate-spin mb-4"></div>
        <p className="font-display text-xs tracking-widest text-neonLime animate-pulse">INITIATING COMMUNITY CORE...</p>
      </div>
    );
  }

  // If user is authenticated and completed onboarding, show the Feed
  if (firebaseUser && userProfile && !onboardingOpen) {
    return (
      <Feed
        currentUser={userProfile}
        onSignOut={handleSignOut}
      />
    );
  }

  // If user is logged in but profile is NOT completed, show onboarding flow modal
  if (firebaseUser && onboardingOpen) {
    return (
      <OnboardingModal
        user={{
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || ""
        }}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // DEFAULT: Landing/Login Page (The Collaboration Screen)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden text-white select-none">
      {/* Brutalist Urban Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>

      {/* Premium Noise Overlay */}
      <div className="absolute inset-0 bg-noise pointer-events-none"></div>

      {/* Decorative neon ambient blur glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neonLime/10 rounded-full blur-[100px] pointer-events-none animate-pulse-fast"></div>

      {/* Premium Authentication Card */}
      <div className="relative w-full max-w-lg glass-panel brutal-border p-8 md:p-12 z-10 transition-all duration-300">

        {/* Sleek dual logo header with a neon accented X */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center gap-6 w-full mb-4">

            {/* St. Stephen's School Placeholders (Left Logo) */}
            <div className="flex flex-col items-center flex-1 text-center">
              <div className="w-16 h-16 bg-[#1a1a1a] border border-white/20 hover:border-white transition-all duration-300 flex items-center justify-center shadow-lg group">
                <svg className="w-8 h-8 text-white group-hover:text-neonLime transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Neon Accented X separator */}
            <div className="font-display text-2xl text-neonLime drop-shadow-[0_0_10px_#d9ff00] animate-pulse">
              X
            </div>

            {/* KikTro Labs Placeholders (Right Logo) */}
            <div className="flex flex-col items-center flex-1 text-center">
              <div className="w-16 h-16 bg-[#1a1a1a] border border-white/20 hover:border-neonLime transition-all duration-300 flex items-center justify-center shadow-lg group">
                <svg className="w-9 h-9 text-neonLime group-hover:text-white transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
            </div>

          </div>

          {/* Under Logo Texts */}
          <div className="flex w-full text-center text-gray-400 font-mono text-[9px] tracking-widest leading-normal mb-8">
            <div className="flex-1 uppercase font-bold px-1">
              ST. STEPHEN'S SCHOOL, BIRATI
            </div>
            <div className="w-6"></div>
            <div className="flex-1 uppercase font-bold text-neonLime px-1">
              KIKTRO LABS
            </div>
          </div>
        </div>

        {/* Brand Headline Info */}
        <div className="text-center mb-8">
          <p className="font-mono text-xs text-neonLime uppercase tracking-widest mb-1.5">COLLABORATION PORTAL</p>
          <h1 className="font-display text-xl md:text-2xl font-bold tracking-widest text-white leading-tight uppercase">
            ROBOTICS <span className="text-neonLime">&</span> AI
          </h1>
          <p className="text-gray-400 text-xs mt-3 font-sans max-w-sm mx-auto leading-relaxed">
            The exclusive maker platform for high-velocity students to exhibit research, secure partners, and code open-source technology.
          </p>
        </div>

        {/* Join CTA & Google Auth Trigger Button */}
        <div className="space-y-4">
          <div className="text-center font-display text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            JOIN THE COMMUNITY
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full py-4 bg-white text-black font-display font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-neonLime hover:text-black shadow-brutalWhite hover:shadow-brutal duration-200 border-2 border-white hover:border-neonLime"
          >
            {/* Simple Google SVG icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>SIGN IN WITH GOOGLE</span>
          </button>
        </div>

        {/* Footer legalities */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center font-mono text-[9px] text-gray-500 uppercase tracking-wider">
          SECURE ENCRYPTED STUDENT HUB // AUTH OPERATED BY FIREBASE
        </div>

      </div>
    </div>
  );
}
