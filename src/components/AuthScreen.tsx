import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, saveUserToFirestore } from "../lib/firebase";
import { PlaydatePreferences, ProposalState } from "../types";
import { ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const PlaydateKidsLogo = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 75 C 15 30, 48 18, 68 28" stroke="#BA3A87" strokeWidth="11" strokeLinecap="round" />
    <path d="M38 75 L 68 28" stroke="#007F61" strokeWidth="8" strokeLinecap="round" />
    <path d="M66 28 C 76 34, 85 52, 85 75" stroke="#f4da53" strokeWidth="9" strokeLinecap="round" />
    <circle cx="80" cy="18" r="11" fill="#f4da53" />
    <circle cx="80" cy="18" r="7" fill="#eb5053" />
    <rect x="52" y="55" width="6" height="20" rx="3" fill="#32271E" />
    <rect x="25" y="62" width="5" height="13" rx="2" fill="#32271E" />
    <ellipse cx="50" cy="82" rx="30" ry="6" fill="#32271E" opacity="0.1" />
  </svg>
);

interface AuthScreenProps {
  preferences: PlaydatePreferences;
  activeProposal: ProposalState | null;
  onSuccess: () => void;
  onClose: () => void;
}

export default function AuthScreen({ preferences, activeProposal, onSuccess, onClose }: AuthScreenProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await saveUserToFirestore(cred.user.uid, cred.user.email ?? "", preferences, activeProposal);
      setDone(true);
      setTimeout(() => onSuccess(), 800);
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(cred.user.uid, email, preferences, activeProposal);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setDone(true);
      setTimeout(() => onSuccess(), 800);
    } catch (err: any) {
      const msg = err.code === "auth/email-already-in-use"
        ? "An account with this email already exists. Try logging in."
        : err.code === "auth/user-not-found" || err.code === "auth/wrong-password"
        ? "Incorrect email or password."
        : err.code === "auth/invalid-email"
        ? "Please enter a valid email address."
        : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#FDFBF7] overflow-hidden text-ttp-brown relative w-full">
      {/* Header */}
      <header className="pt-8 pb-4 px-5 border-b border-ttp-beige/40 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <PlaydateKidsLogo />
          <div className="text-left">
            <span className="font-display text-base font-extrabold text-ttp-blue tracking-tight leading-none block">Time to Play</span>
            <span className="text-[9px] font-bold text-ttp-pink tracking-widest uppercase mt-0.5 block">Create Account</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] font-bold text-ttp-pink hover:text-ttp-coral border-2 border-ttp-beige/50 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-stone-50 transition cursor-pointer"
        >
          ← Back
        </button>
      </header>

      <div className="flex-1 overflow-y-auto phone-scroll p-4 pb-8 flex flex-col gap-4">

        {/* Proposal recap */}
        {activeProposal && (
          <div className="bg-ttp-blue/5 border-2 border-ttp-blue/20 rounded-2xl p-4 text-center">
            <p className="text-[10px] font-extrabold text-ttp-blue uppercase tracking-wider mb-1">Your Playdate is Ready</p>
            <p className="text-sm font-bold text-ttp-brown">
              {activeProposal.dayText}, {activeProposal.dateText} at {activeProposal.timeText}
            </p>
            <p className="text-xs text-stone-500 font-semibold mt-0.5">Save it by creating your free account below</p>
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex bg-stone-100 rounded-2xl p-1 gap-1">
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${mode === "signup" ? "bg-white shadow text-ttp-blue" : "text-stone-400"}`}
          >
            Create Account
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${mode === "login" ? "bg-white shadow text-ttp-blue" : "text-stone-400"}`}
          >
            Log In
          </button>
        </div>

        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 border-2 border-emerald-200 text-center flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="font-bold text-sm text-ttp-blue">
                {mode === "signup" ? "Account created!" : "Welcome back!"}
              </p>
              <p className="text-xs text-stone-500">Opening share...</p>
            </motion.div>
          ) : (
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-xs flex flex-col gap-4">

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-ttp-brown uppercase tracking-wide">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-3 py-2.5 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition text-ttp-blue"
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-ttp-brown uppercase tracking-wide">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Min. 6 characters"
                      className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition text-ttp-blue"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password (signup only) */}
                {mode === "signup" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-ttp-brown uppercase tracking-wide">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat password"
                      className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-3 py-2.5 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition text-ttp-blue"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border-2 border-rose-200 p-3 rounded-2xl">
                  ⚠️ {error}
                </div>
              )}

              {/* Google sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white hover:bg-stone-50 text-ttp-brown border-2 border-ttp-beige py-3.5 rounded-2xl font-bold text-xs tracking-wide shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-ttp-beige" />
                <span className="text-[10px] font-bold text-stone-400">or</span>
                <div className="flex-1 h-px bg-ttp-beige" />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-ttp-blue hover:bg-ttp-blue/90 text-white py-3.5 rounded-2xl font-bold text-xs tracking-wide shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Please wait...</span>
                ) : (
                  <>
                    <span>{mode === "signup" ? "Create Account & Share" : "Log In & Share"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-stone-400 font-semibold">
                {mode === "signup" ? "Already have an account? " : "New here? "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}
                  className="text-ttp-pink font-bold underline"
                >
                  {mode === "signup" ? "Log in" : "Create account"}
                </button>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
