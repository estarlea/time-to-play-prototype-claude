import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Sparkles, ExternalLink, ArrowRight, ShieldCheck } from "lucide-react";
import { submitToGoogleForm } from "../lib/googleForm";

// A beautiful, highly custom-vibrant vector of a playground slide logo, adhering to brand identity
const PlaydateKidsLogo = () => (
  <svg viewBox="0 0 100 100" className="w-10 h-10 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Rainbow/Pink Arch slide */}
    <path d="M15 75 C 15 30, 48 18, 68 28" stroke="#BA3A87" strokeWidth="11" strokeLinecap="round" />
    <path d="M38 75 L 68 28" stroke="#007F61" strokeWidth="8" strokeLinecap="round" />
    <path d="M66 28 C 76 34, 85 52, 85 75" stroke="#f4da53" strokeWidth="9" strokeLinecap="round" />
    {/* Sun graphic */}
    <circle cx="80" cy="18" r="11" fill="#f4da53" />
    <circle cx="80" cy="18" r="7" fill="#eb5053" />
    {/* Ground support structure */}
    <rect x="52" y="55" width="6" height="20" rx="3" fill="#32271E" />
    <rect x="25" y="62" width="5" height="13" rx="2" fill="#32271E" />
    {/* Play sandbox background item */}
    <ellipse cx="50" cy="82" rx="30" ry="6" fill="#32271E" opacity="0.1" />
  </svg>
);

interface EarlyAccessFormProps {
  isOpen: boolean;
  onClose: () => void;
  addAuditLog: (event: string, category: "AI" | "CALENDAR" | "SMS" | "SYSTEM", description: string) => void;
  parentPreferences?: {
    childName?: string;
    parentName?: string;
  };
  onExplorePrototypeMore?: () => void;
}

export default function EarlyAccessForm({
  isOpen,
  onClose,
  addAuditLog,
  parentPreferences,
  onExplorePrototypeMore
}: EarlyAccessFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const clean = value.replace(/\D/g, "").slice(0, 10);
      setFormData(prev => ({ ...prev, phone: clean }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMsg("Please fill in both first name and last name.");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number (digits only, e.g. 7205550120).");
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit lead to Google Form → responses appear in linked Google Sheet
      await submitToGoogleForm({
        firstName: formData.firstName,
        lastName:  formData.lastName,
        email:     formData.email,
        phone:     formData.phone,
      });

      addAuditLog(
        "Early Access Recorded 🚀",
        "SYSTEM",
        `Registered early access subscriber: ${formData.firstName} ${formData.lastName} (${formData.email}). Saved to Google Sheet.`
      );

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMsg("Unable to register at this time. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-screen max-h-screen select-none bg-[#FDFBF7] overflow-hidden text-ttp-brown relative w-full">
      {/* Header element */}
      <header className="pt-8 pb-4 px-5 border-b border-ttp-beige/40 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <PlaydateKidsLogo />
          <div className="text-left">
            <span className="font-display text-base font-extrabold text-ttp-blue tracking-tight leading-none block">Time to Play</span>
            <span className="text-[9px] font-bold text-ttp-pink tracking-widest uppercase mt-0.5 block">Beta Access</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] font-bold text-ttp-pink hover:text-ttp-coral border-2 border-ttp-beige/50 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-stone-50 transition cursor-pointer"
          title="Return to Prototype"
        >
          ← Back
        </button>
      </header>

      {/* Screen Core Scroll Area */}
      <div className="flex-1 overflow-y-auto phone-scroll p-4 pb-8 flex flex-col gap-4">
        
        {/* Header Information Card */}
        {!isSubmitted && (
          <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-xs flex flex-col gap-3 text-[#32271E] text-left">
            <div className="flex items-center gap-2 text-ttp-pink">
              <Sparkles className="w-4 h-4 fill-ttp-pink/10" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Exclusive Beta Invitation</span>
            </div>
            
            <h1 className="text-xl font-extrabold tracking-tight text-ttp-blue font-display leading-tight border-b border-ttp-beige/40 pb-2">
              Wait! Get Early Access!
            </h1>
            
            <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-md max-w-max">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              <span>This is just a prototype.</span>
            </div>

            <p className="text-xs leading-relaxed font-semibold">
              Thank you for exploring the <strong className="text-ttp-pink font-extrabold">Time to Play</strong> prototype! We are currently testing this app feature. If you liked what you saw, sign up below to join our pilot testers group and get exclusive early access when this feature goes live in the next couple of weeks!
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.form
              key="enroll-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-xs flex flex-col gap-4">
                {/* First Name */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-[#32271E] tracking-wide uppercase">
                    First Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    placeholder="Your First Name"
                    className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                  />
                </div>

                {/* Last Name */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-[#32271E] tracking-wide uppercase">
                    Last Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    placeholder="Your Last Name"
                    className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                  />
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-[#32271E] tracking-wide uppercase">
                    Email Address <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                  />
                </div>

                {/* Phone Number */}
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-extrabold text-[#32271E] tracking-wide uppercase">
                    Phone Number (10 digits, numbers only) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="e.g. 7205550120"
                    className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border-2 border-rose-200 p-3.5 rounded-2xl text-left">
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex flex-col gap-2.5 mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#0B4283] hover:bg-[#0B4283]/95 text-white py-3.5 rounded-2xl font-bold text-xs tracking-wide shadow transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Syncing Response...</span>
                  ) : (
                    <>
                      <span>Submit Response</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-center text-ttp-pink hover:text-ttp-coral font-bold text-xs py-3.5 rounded-2xl transition cursor-pointer bg-white border-2 border-ttp-beige/50"
                >
                  ← Resume Prototype
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="enroll-success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-xs text-center flex flex-col items-center gap-4 text-[#32271E]"
            >
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-200 shadow-3xs animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              
              <h3 className="text-lg font-extrabold text-ttp-blue font-display text-center leading-tight">
                Put Playdates on Autopilot
              </h3>

              <p className="text-xs text-stone-600 leading-relaxed font-semibold">
                Perfect! You have been registered in our beta tester pool. You can sign up for our live scheduling product on the button below.
              </p>

              <div className="flex flex-col gap-2 w-full mt-2">
                <a
                  href="https://app2.timetoplayscheduler.com/onboarding/register"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="w-full bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white text-xs font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <span>Use Time to Play</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                
                <button
                  type="button"
                  onClick={onExplorePrototypeMore || onClose}
                  className="w-full bg-[#0B4283] hover:bg-[#0B4283]/95 text-white text-xs font-bold py-3.5 rounded-2xl transition shadow cursor-pointer"
                >
                  Explore Prototype More
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info panel */}
        <div className="border-t-2 border-ttp-beige/30 pt-5 text-center flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-stone-500 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Verifiable Pilot • Time to Play Scheduler</span>
          </div>
          
          <a
            href="https://www.timetoplayscheduler.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-extrabold text-[#0B4283] hover:underline flex items-center gap-1"
          >
            <span>Official Portal: www.timetoplayscheduler.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
