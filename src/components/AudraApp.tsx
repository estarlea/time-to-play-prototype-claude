import React, { useState } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { logFieldSubmission } from "../lib/googleForm";
import { 
  PlaydatePreferences, 
  OtherParent, 
  ProposalState, 
  TimeSlotId, 
  SimulatedStep, 
} from "../types";
import { PRESET_LOTS, calculateBestProposal, MOCK_CALENDAR_EVENTS, getSlotDateTime, formatSlotDateTime } from "../data";
import { 
  Sparkles, 
  Calendar, 
  Check, 
  Plus, 
  Minus,
  Star,
  ChevronRight, 
  Clock, 
  UserPlus, 
  Info, 
  CalendarCheck,
  RotateCcw,
  Shuffle,
  GripVertical
} from "lucide-react";

interface AudraAppProps {
  preferences: PlaydatePreferences;
  setPreferences: React.Dispatch<React.SetStateAction<PlaydatePreferences>>;
  whitneyParent: OtherParent;
  setWhitneyParent: React.Dispatch<React.SetStateAction<OtherParent>>;
  currentStep: SimulatedStep;
  setCurrentStep: (step: SimulatedStep) => void;
  activeProposal: ProposalState | null;
  setActiveProposal: React.Dispatch<React.SetStateAction<ProposalState | null>>;
  addAuditLog: (event: string, category: "AI" | "CALENDAR" | "SMS" | "SYSTEM", description: string) => void;
  triggerSmsFlow: (proposal: ProposalState) => void;
  resetSimulation: () => void;
  trackClick?: (buttonId: string) => void;
  onTriggerEarlyAccess?: () => void;
}

// A beautiful, highly custom-vibrant vector of a playground slide logo, adhering to brand identity
export const PlaydateKidsLogo = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 shrink-0 animate-float" fill="none" xmlns="http://www.w3.org/2000/svg">
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

export default function AudraApp({
  preferences,
  setPreferences,
  whitneyParent,
  setWhitneyParent,
  currentStep,
  setCurrentStep,
  activeProposal,
  setActiveProposal,
  addAuditLog,
  triggerSmsFlow,
  resetSimulation,
  trackClick,
  onTriggerEarlyAccess
}: AudraAppProps) {

  const [selectedLocation, setSelectedLocation] = useState("");
  const [copied, setCopied] = useState(false);
  const [onboardingSubPage, setOnboardingSubPage] = useState(1);
  const [inviteGenerated, setInviteGenerated] = useState(false);
  const [showIosShareSheet, setShowIosShareSheet] = useState(false);
  const [inviteAgreedTerms, setInviteAgreedTerms] = useState(false);
  const [inviteAgreedMarketing, setInviteAgreedMarketing] = useState(false);

  const [parentFirstName, setParentFirstName] = useState(() => {
    const parts = (preferences.parentName || "").split(/\s+/);
    return parts[0] || "";
  });
  const [parentLastName, setParentLastName] = useState(() => {
    const parts = (preferences.parentName || "").split(/\s+/);
    return parts.slice(1).join(" ") || "";
  });

  // Sync internal state when external preferences parentName updates (e.g. on reset)
  React.useEffect(() => {
    const parts = (preferences.parentName || "").split(/\s+/);
    setParentFirstName(parts[0] || "");
    setParentLastName(parts.slice(1).join(" ") || "");
  }, [preferences.parentName]);

  const handleFirstNameChange = (val: string) => {
    setParentFirstName(val);
    const fullName = `${val.trim()} ${parentLastName.trim()}`.trim();
    setPreferences({ ...preferences, parentName: fullName });
  };

  const handleLastNameChange = (val: string) => {
    setParentLastName(val);
    const fullName = `${parentFirstName.trim()} ${val.trim()}`.trim();
    setPreferences({ ...preferences, parentName: fullName });
  };

  // Sync state when returning to onboarding step
  React.useEffect(() => {
    if (currentStep === "audra_onboarding") {
      setOnboardingSubPage(1);
      setInviteGenerated(false);
      setShowIosShareSheet(false);
      setInviteAgreedTerms(false);
      setInviteAgreedMarketing(false);
    }
  }, [currentStep]);

  // Sync selectedLocation if empty and favoriteLocations are available
  React.useEffect(() => {
    if (!selectedLocation && preferences.favoriteLocations && preferences.favoriteLocations.length > 0) {
      setSelectedLocation(preferences.favoriteLocations[0]);
    }
  }, [preferences.favoriteLocations, selectedLocation]);

  // Toggle selection & update rankings
  const handleSlotToggle = (slotId: TimeSlotId) => {
    if (slotId.startsWith("fri")) trackClick?.("Button_Audra_Select_Friday");
    else if (slotId.startsWith("sat")) trackClick?.("Button_Audra_Select_Saturday");
    else if (slotId.startsWith("sun")) trackClick?.("Button_Audra_Select_Sunday");
    trackClick?.("Button_Audra_Time_Picker");

    let newRanked = [...preferences.rankedSlots];
    const index = newRanked.indexOf(slotId);
    
    if (index > -1) {
      newRanked.splice(index, 1);
      addAuditLog(`Deregistered preferences slot`, "SYSTEM", `Removed slot '${slotId.split('_').join(' ')}' from preferences.`);
    } else {
      if (newRanked.length >= 5) {
        // Limit to 5 slots
        newRanked[4] = slotId;
        addAuditLog(`Updated top preferences slots`, "SYSTEM", `Pref-Limit is 5. Swapped 5th slot for '${slotId.split('_').join(' ')}'.`);
      } else {
        newRanked.push(slotId);
        addAuditLog(`Added slot to preferences`, "SYSTEM", `Registered slot '${slotId.split('_').join(' ')}' at index #${newRanked.length}.`);
      }
    }
    setPreferences({ ...preferences, rankedSlots: newRanked });
  };

  // Reorder rank priorities up/down
  const moveRank = (index: number, direction: "up" | "down") => {
    const newRanked = [...preferences.rankedSlots];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newRanked.length) {
      const temp = newRanked[index];
      newRanked[index] = newRanked[targetIndex];
      newRanked[targetIndex] = temp;
      setPreferences({ ...preferences, rankedSlots: newRanked });
      addAuditLog(`Reordered scheduling rankings`, "SYSTEM", `Moved priority for '${temp.split('_').join(' ')}' of ranking list.`);
    }
  };

  // Complete onboarding → dashboard (we now separate onboarding from booking!)
  const handleCompleteOnboarding = () => {
    if (preferences.rankedSlots.length === 0) {
      alert("Please rank at least 1 playdate preference to continue!");
      return;
    }
    if (!preferences.favoriteLocations || preferences.favoriteLocations.length === 0) {
      alert("Please set up at least 1 favorite meeting spot!");
      return;
    }
    // Transition to the dedicated booking screen (audra_dashboard)
    setCurrentStep("audra_dashboard");
    addAuditLog("Onboarding Completed", "SYSTEM", `Audra finished the onboarding configuration with ${preferences.favoriteLocations.length} locations and ${preferences.rankedSlots.length} timeslots.`);
  };

  // Request proposal computation
  const handleInitiatePlaydate = () => {
    const cleanPhone = (whitneyParent.phone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit phone number for the friend's parent (digits only, e.g. 7205550143)!");
      return;
    }
    const { proposal, log } = calculateBestProposal(preferences, whitneyParent);
    const updatedProposal = {
      ...proposal,
      locationText: selectedLocation || (preferences.favoriteLocations && preferences.favoriteLocations[0]) || `${preferences.childName || "Emma"}'s place`
    };
    setActiveProposal(updatedProposal);
    setCurrentStep("audra_proposal");
    setInviteGenerated(false);
    setShowIosShareSheet(false);
    
    // Log details of AI logic
    log.forEach(item => {
      const cat = item.includes("📅") || item.includes("⚠️") ? "CALENDAR" : (item.includes("🔍") || item.includes("✨") ? "AI" : "SYSTEM");
      addAuditLog(item.replace(/[^\w\s\-\:\'\.\,\(\)\/]/gi, '').trim(), cat, "Automated TTP proposal generation processing.");
    });
  };

  // Send proposal to Whitney
  const handleSendProposal = () => {
    if (!activeProposal) return;
    triggerSmsFlow(activeProposal);
  };

  // Remix proposal to toggle/cycle through available slots and locations
  const handleRemixProposal = () => {
    if (!activeProposal) return;
    
    // Get valid slots from Audra's preferences
    let list = [...preferences.rankedSlots];
    
    // Filter calendar blocker if active
    if (preferences.calendarBlockerActive) {
      const blockedSlots = MOCK_CALENDAR_EVENTS
        .filter(e => e.affectsSlot !== null)
        .map(e => e.affectsSlot as TimeSlotId);
      list = list.filter(s => !blockedSlots.includes(s));
    }
    
    // Filter 36 hours lead time
    let now = new Date(2026, 5, 16, 16, 34, 19);
    const minTimeNeeded = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    list = list.filter(s => getSlotDateTime(s, preferences.afterSchoolTime) >= minTimeNeeded);
    
    if (list.length === 0) {
      // Fallback to all PRESET_LOTS that are valid if preferred list is empty or blocked
      list = PRESET_LOTS.map(p => p.id).filter(s => getSlotDateTime(s, preferences.afterSchoolTime) >= minTimeNeeded);
    }
    
    // Find current index
    const currentIndex = list.indexOf(activeProposal.slotIdUsed);
    const nextIndex = (currentIndex + 1) % list.length;
    const nextSlot = list[nextIndex] || activeProposal.slotIdUsed;
    
    const { day, time } = formatSlotDateTime(nextSlot, preferences.afterSchoolTime);
    
    // Also cycle locations if there are multiple favorite locations
    let nextLocation = activeProposal.locationText;
    const locations = preferences.favoriteLocations || [];
    if (locations.length > 1) {
      const currentLocIndex = locations.indexOf(activeProposal.locationText);
      const nextLocIndex = (currentLocIndex + 1) % locations.length;
      nextLocation = locations[nextLocIndex];
    }
    
    const updatedProposal: ProposalState = {
      ...activeProposal,
      dayText: day.split(" (")[0],
      dateText: day.includes("(") ? day.split(" (")[1].replace(")", "") : "June 20",
      timeText: time,
      slotIdUsed: nextSlot,
      locationText: nextLocation
    };
    
    setActiveProposal(updatedProposal);
    addAuditLog("Remixed Proposal Slot", "AI", `Remixed to alternative slot: ${nextSlot.split('_').join(' ')} at ${nextLocation}`);
    
    // Reset invite generation if it was done so Whitney can see the new one
    setInviteGenerated(false);
    setShowIosShareSheet(false);
  };

  // Toggle calendar blocker state
  const handleToggleCalendarBlocker = () => {
    trackClick?.("Button_Audra_Toggle_Calendar_Blockers");
    const nextVal = !preferences.calendarBlockerActive;
    setPreferences({ ...preferences, calendarBlockerActive: nextVal });
    addAuditLog(`${nextVal ? 'Connected' : 'Disconnected'} Calendar Link`, "CALENDAR", `Option for automated scheduling filters updated.`);
  };

  const orderedSlots = [
    ...(preferences.rankedSlots.map(id => PRESET_LOTS.find(p => p.id === id)).filter(Boolean) as typeof PRESET_LOTS),
    ...PRESET_LOTS.filter(p => !preferences.rankedSlots.includes(p.id))
  ];

  const hasAfterSchoolSelected = preferences.rankedSlots.some(s => s.endsWith("afterschool"));

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans text-ttp-brown relative">
      
      {/* Upper Navigation Header aligned to brand colors */}
      <header className="px-4 py-3 bg-white border-b-2 border-ttp-grey flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5.5 h-5.5 bg-ttp-coral rounded-lg flex items-center justify-center text-white font-display font-medium text-xs">🧩</div>
          <span className="text-sm font-black tracking-tight text-ttp-blue font-display">Time to Play</span>
        </div>
        
        <button 
          onClick={resetSimulation} 
          className="text-[10px] font-bold text-ttp-pink hover:text-ttp-coral border-2 border-ttp-beige/50 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-stone-50 transition"
          title="Reset Simulator"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>Reset</span>
        </button>
      </header>

      {/* Screen Core Scroll Area */}
      <div className="flex-1 overflow-y-auto phone-scroll pb-6">
        <AnimatePresence mode="wait">
          {/* STEP 1: AUDRA ONBOARDING VIEW */}
          {currentStep === "audra_onboarding" && (
            <motion.div
              key={`onboarding-page-${onboardingSubPage}`}
              initial={{ opacity: 0, x: onboardingSubPage === 1 ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: onboardingSubPage === 3 ? 15 : -15 }}
              className="p-4 flex flex-col gap-4.5"
            >
              {/* WELCOME BANNER FOR CURRENT PAGE */}
              <div className="text-center py-3 bg-ttp-coral/10 rounded-3xl border-2 border-dashed border-ttp-coral/25 px-3">
                <h1 className="text-xl font-extrabold tracking-tight text-ttp-blue font-display leading-tight">
                  {onboardingSubPage === 1 && "Family Profile Info"}
                  {onboardingSubPage === 2 && "Set Your Playdate Times"}
                  {onboardingSubPage === 3 && "Set Playdate Locations"}
                </h1>
                <p className="text-sm uppercase tracking-wider font-extrabold text-ttp-pink mt-0.5">
                  Step {onboardingSubPage} of 3
                </p>
              </div>

              {/* PAGE 1: FAMILY INFO */}
              {onboardingSubPage === 1 && (
                <div className="flex flex-col gap-4">
                  {/* Profiles Setup */}
                  <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-bold text-ttp-brown mb-1 uppercase tracking-wider text-left">Parent First Name</label>
                        <input
                          type="text"
                          value={parentFirstName}
                          onChange={(e) => handleFirstNameChange(e.target.value)}
                          onBlur={(e) => logFieldSubmission("Parent First Name", e.target.value)}
                          className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                          placeholder="e.g. Audra"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ttp-brown mb-1 uppercase tracking-wider text-left">Parent Last Name</label>
                        <input
                          type="text"
                          value={parentLastName}
                          onChange={(e) => handleLastNameChange(e.target.value)}
                          onBlur={(e) => logFieldSubmission("Parent Last Name", e.target.value)}
                          className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                          placeholder="e.g. Johnson"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-ttp-brown mb-1 uppercase tracking-wider">Your Child's Name</label>
                      <input
                        type="text"
                        value={preferences.childName}
                        onChange={(e) => setPreferences({ ...preferences, childName: e.target.value })}
                        onBlur={(e) => logFieldSubmission("Child's Name", e.target.value)}
                        className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                        placeholder="e.g. Emma"
                      />
                    </div>
                  </div>

                  {/* Playdate target cadence / Ideal frequency per month */}
                  <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
                    <h2 className="text-sm font-extrabold uppercase tracking-wide text-ttp-blue font-display flex items-center gap-1.5 font-sans">
                      <span>🗓️ Ideal Playdates Per Month</span>
                    </h2>
                    <div className="flex gap-2">
                      {[1, 2, 4, 8].map((cadence) => (
                        <button
                          key={cadence}
                          type="button"
                          onClick={() => {
                            setPreferences({ ...preferences, cadencePerMonth: cadence });
                            addAuditLog("Set Playdate Cadence", "SYSTEM", `Configured ideal frequency to ${cadence} playdates per month.`);
                          }}
                          className={`flex-1 text-sm py-3 rounded-xl border-2 font-bold transition-all ${
                            preferences.cadencePerMonth === cadence
                              ? "bg-ttp-coral text-white border-ttp-coral shadow-3xs"
                              : "bg-stone-50 text-ttp-brown border-ttp-beige hover:bg-stone-100"
                          }`}
                        >
                          {cadence === 1 && "1/mo"}
                          {cadence === 2 && "2/mo"}
                          {cadence === 4 && "4/mo"}
                          {cadence === 8 && "8/mo"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Continue button */}
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        trackClick?.("Button_Audra_Next_Onboarding_Slide1");
                        if (!preferences.parentName.trim() || !preferences.childName.trim()) {
                          alert("Please fill in both parent and child names first!");
                          return;
                        }
                        setOnboardingSubPage(2);
                        addAuditLog("Pushed Stepper Page", "SYSTEM", "Navigated to page 2 (preferred times)");
                      }}
                      className="w-full bg-ttp-coral hover:bg-ttp-coral/95 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 transition-all"
                    >
                      <span>Continue to Play Times</span>
                      <ChevronRight className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}

              {/* PAGE 2: PLAY TIMES SETUP */}
              {onboardingSubPage === 2 && (
                <div className="flex flex-col gap-4">
                  {/* Calendar blocker */}
                  <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-ttp-blue" />
                        <span className="text-sm font-extrabold text-[#7c6a5e] font-display uppercase tracking-wide">🗓️ Compare Calendars</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.calendarBlockerActive}
                          onChange={handleToggleCalendarBlocker}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-ttp-coral"></div>
                      </label>
                    </div>
                    
                    <p className="text-sm text-ttp-brown/80 font-medium leading-normal">
                      When turned on, Time to Play will not suggest times that overlap with your calendar events.
                    </p>

                    {preferences.calendarBlockerActive && (
                      <div className="flex flex-col gap-3 border-t-2 border-ttp-grey pt-3 mt-1">
                        <div>
                          <label className="block text-sm font-extrabold uppercase tracking-wider text-ttp-blue font-display mb-1">Calendar Email Address</label>
                          <input
                            type="email"
                            value="ParentCalendarEmail@gmail.com"
                            readOnly={true}
                            className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-3 py-2.5 bg-stone-100 text-stone-500 cursor-not-allowed focus:outline-none"
                            placeholder="ParentCalendarEmail@gmail.com"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
                    <div className="flex flex-col gap-3 mt-1">
                      {/* Ranked/Draggable Items */}
                      {preferences.rankedSlots.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm uppercase tracking-wider font-extrabold text-ttp-blue/70 block mb-0.5 font-display">Select Up to 5 Times (Drag to Prioritize)</span>
                          <Reorder.Group
                            axis="y"
                            values={preferences.rankedSlots}
                            onReorder={(newOrder) => {
                              setPreferences({ ...preferences, rankedSlots: newOrder });
                              addAuditLog("Reordered Play Times", "SYSTEM", `Audra rearranged preference ranks: ${newOrder.map(id => PRESET_LOTS.find(p => p.id === id)?.label).join(", ")}`);
                            }}
                            className="flex flex-col gap-1.5"
                          >
                            {preferences.rankedSlots.map((slotId) => {
                              const slot = PRESET_LOTS.find((p) => p.id === slotId);
                              if (!slot) return null;
                              const rankIndex = preferences.rankedSlots.indexOf(slotId);
                              return (
                                <Reorder.Item
                                  key={slotId}
                                  value={slotId}
                                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 bg-ttp-yellow/15 border-ttp-yellow text-ttp-blue font-bold shadow-3xs hover:bg-ttp-yellow/20 cursor-grab active:cursor-grabbing select-none touch-none"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSlotToggle(slotId);
                                    }}
                                    className="w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-ttp-blue bg-white text-ttp-blue shrink-0 hover:bg-ttp-blue/10 transition-colors"
                                    title="Remove time"
                                  >
                                    <Minus className="w-3 h-3 stroke-[3.5]" />
                                  </button>

                                  <div className="flex flex-col text-left flex-1 min-w-0">
                                    <span className="text-sm font-black truncate">{slot.label}</span>
                                    <span className="text-sm text-ttp-brown/65 font-semibold truncate">
                                      {slot.category === "weekend" ? slot.defaultTime : "Afternoon"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 pr-0.5 select-none">
                                    <span className="w-5.5 h-5.5 rounded-full flex items-center justify-center bg-ttp-yellow text-ttp-blue text-xs font-black border border-ttp-yellow-45 shadow-2xs">
                                      {rankIndex + 1}
                                    </span>
                                    <div className="text-ttp-brown/40 flex items-center">
                                      <GripVertical className="w-4 h-4 cursor-row-resize" />
                                    </div>
                                  </div>
                                </Reorder.Item>
                              );
                            })}
                          </Reorder.Group>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-ttp-beige rounded-2xl p-4 text-center bg-stone-50/50">
                          <p className="text-sm font-bold text-ttp-brown/60 italic">Set your playdate times</p>
                          <p className="text-sm text-ttp-brown/50 mt-0.5 font-medium">Tap available options below to build your schedule.</p>
                        </div>
                      )}

                      {/* Addable Available Times & After School Selector Group */}
                      {(hasAfterSchoolSelected || PRESET_LOTS.filter(s => !preferences.rankedSlots.includes(s.id)).length > 0) && (
                        <div className="flex flex-col gap-3 border-t-2 border-dashed border-ttp-beige/60 pt-3">
                           {/* Conditional after-school time selection */}
                          {hasAfterSchoolSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="flex flex-col gap-1.5 pb-1"
                            >
                              <label className="block text-sm font-bold text-ttp-brown">
                                Typical after school playdate time:
                              </label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {["3:00 PM", "4:00 PM", "5:00 PM"].map((t) => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                      trackClick?.("Button_Audra_Duration_Adjust");
                                      setPreferences({ ...preferences, afterSchoolTime: t as any });
                                    }}
                                    className={`text-sm py-2 rounded-xl border-2 font-bold transition ${
                                      preferences.afterSchoolTime === t
                                        ? "bg-ttp-coral text-white border-ttp-coral"
                                        : "bg-white text-ttp-brown border-ttp-beige hover:bg-stone-50"
                                    }`}
                                  >
                                    {t}+
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Addable Available Times */}
                          {PRESET_LOTS.filter(s => !preferences.rankedSlots.includes(s.id)).length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-sm uppercase tracking-wider font-extrabold text-ttp-brown/70 block mb-0.5 font-display">Available Play Times (Tap to Add):</span>
                              <div className="flex flex-col gap-1.5">
                                {PRESET_LOTS.filter(s => !preferences.rankedSlots.includes(s.id)).map((slot) => (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => handleSlotToggle(slot.id)}
                                    className="flex items-center justify-between p-2.5 rounded-xl border-2 border-ttp-grey bg-white hover:bg-stone-50 text-sm text-ttp-brown/80 font-bold text-left transition-all shadow-3xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-ttp-beige text-ttp-beige shrink-0">
                                        <Plus className="w-3 h-3 stroke-[3]" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-ttp-brown">{slot.label}</span>
                                        <span className="text-sm text-ttp-brown/50 font-semibold">
                                          {slot.category === "weekend" ? slot.defaultTime : "Afternoon"}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stepper buttons */}
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingSubPage(1);
                        addAuditLog("Pushed Stepper Page", "SYSTEM", "Navigated back to page 1");
                      }}
                      className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 border-2 border-ttp-beige flex items-center justify-center text-ttp-brown/80 shadow-xs transition-all active:scale-95"
                      title="Back"
                    >
                      <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        trackClick?.("Button_Audra_Next_Onboarding_Slide2");
                        if (preferences.rankedSlots.length === 0) {
                          alert("Please choose at least 1 preferred playdate afternoon/morning timeslot to proceed!");
                          return;
                        }
                        setOnboardingSubPage(3);
                        addAuditLog("Pushed Stepper Page", "SYSTEM", "Navigated to page 3 (favorite locations)");
                      }}
                      className="flex-1 bg-ttp-coral hover:bg-ttp-coral/95 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1 transition-all"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              )}

              {/* PAGE 3: FAVORITE PLAYDATE SPOTS */}
              {onboardingSubPage === 3 && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-3xl p-4.5 border-2 border-ttp-beige shadow-xs flex flex-col gap-3.5">
                    <div className="flex flex-col gap-3 mt-1">
                      {[0, 1, 2].map((idx) => {
                        const labels = [
                          "1st Choice Spot (Preferred Default) ⭐",
                          "2nd Choice Spot 🏡",
                          "3rd Choice Spot 🌳"
                        ];
                        const placeholders = [
                          `${preferences.childName || "Emma"}'s place`,
                          "your place",
                          "local playground"
                        ];
                        
                        const val = preferences.favoriteLocations && preferences.favoriteLocations[idx] !== undefined
                          ? preferences.favoriteLocations[idx]
                          : "";

                        return (
                          <div key={idx} className="flex flex-col gap-1 text-left">
                            <label className="block text-sm font-bold text-ttp-brown">
                              {labels[idx]}
                            </label>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => {
                                trackClick?.("Button_Audra_Add_Alternate_Location");
                                const updated = [...(preferences.favoriteLocations || [])];
                                for (let i = 0; i <= idx; i++) {
                                  if (updated[i] === undefined) {
                                    updated[i] = "";
                                  }
                                }
                                updated[idx] = e.target.value;
                                setPreferences({ ...preferences, favoriteLocations: updated });
                              }}
                              onBlur={(e) => logFieldSubmission(`Preferred Spot Option ${idx + 1}`, e.target.value)}
                              className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                              placeholder={placeholders[idx] || `${preferences.childName || "Emma"}'s place`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stepper buttons (Final submission) */}
                  <div className="mt-1 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOnboardingSubPage(2);
                        addAuditLog("Pushed Stepper Page", "SYSTEM", "Navigated back to page 2");
                      }}
                      className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 border-2 border-ttp-beige flex items-center justify-center text-ttp-brown/80 shadow-xs transition-all active:scale-95"
                      title="Back"
                    >
                      <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        trackClick?.("Button_Audra_Next_Onboarding_Slide3");
                        trackClick?.("Button_Audra_Complete_Onboarding");
                        const dynamicFallback = `${preferences.childName || "Emma"}'s place`;
                        const validLocations = (preferences.favoriteLocations || []).map((l, i) => {
                          const trimmed = l.trim();
                          if (trimmed) return trimmed;
                          if (i === 0) return dynamicFallback;
                          if (i === 1) return "your place";
                          return "local playground";
                        }).filter(Boolean);
                        if (validLocations.length === 0) {
                           alert(`Please specify at least 1 playdate location (e.g. ${dynamicFallback})!`);
                          return;
                        }
                        // Instantly compile overlap proposal and complete onboarding!
                        const cleanedPrefs = { ...preferences, favoriteLocations: validLocations };
                        setPreferences(cleanedPrefs);
                        addAuditLog("Onboarding Completed & Plan Playdate", "SYSTEM", `Approved profile setup with ${validLocations.join(", ")}.`);

                        // Calculate Best Proposal
                        const { proposal, log } = calculateBestProposal(cleanedPrefs, whitneyParent);
                        const topLoc = validLocations[0] || `${preferences.childName || "Emma"}'s place`;
                        const updatedProposal = {
                          ...proposal,
                          locationText: topLoc
                        };
                        setSelectedLocation(topLoc);
                        setActiveProposal(updatedProposal);
                        
                        // Switch page step
                        setCurrentStep("audra_proposal");
                        
                        log.forEach(item => {
                           const cat = item.includes("📅") || item.includes("⚠️") ? "CALENDAR" : (item.includes("🔍") || item.includes("✨") ? "AI" : "SYSTEM");
                          addAuditLog(item.replace(/[^\w\s\-\:\'\.\,\(\)\/]/gi, '').trim(), cat, "Automated TTP proposal generation processing.");
                        });
                      }}
                      className="flex-1 bg-ttp-coral hover:bg-ttp-coral/95 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 transition-all animate-pulse"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-ttp-yellow fill-ttp-yellow" />
                      <span>Plan a Playdate</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: AUDRA DASHBOARD / BOOKING CENTER */}
          {currentStep === "audra_dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-4 flex flex-col gap-4.5"
            >
              {/* Profile Card Header */}
              <div className="bg-gradient-to-br from-ttp-blue to-ttp-blue/90 rounded-3xl p-4.5 text-white shadow-md relative overflow-hidden">
                <div className="absolute right-[-15px] bottom-[-15px] w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                <div className="flex justify-between items-start z-10 relative">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-ttp-yellow font-display">👪 Playdate Hub</span>
                    <h2 className="text-lg font-bold mt-0.5 font-display">{preferences.childName}'s Social Track</h2>
                  </div>
                  <div className="bg-ttp-coral px-3 py-1.5 rounded-xl text-center border border-white/20 shadow-xs">
                    <p className="text-[9px] opacity-90 font-bold uppercase tracking-wider text-white">Cadence</p>
                    <p className="text-xs font-black text-white">{preferences.cadencePerMonth} / Mo</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/25 pt-3 z-10 relative">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-ttp-yellow animate-pulse"></div>
                    <span className="text-[11px] text-white font-bold">Due for Playdate!</span>
                  </div>
                  <span className="text-[10px] text-white/90 font-medium">Last met 11 days ago</span>
                </div>
              </div>

              {/* DEDICATED BOOKING WORKSPACE */}
              <div className="bg-white rounded-3xl p-4.5 border-2 border-ttp-beige shadow-xs flex flex-col gap-4">
                <div className="flex justify-between items-center pb-2 border-b-2 border-dashed border-ttp-beige">
                  <h3 className="text-xs font-extrabold uppercase tracking-wide text-ttp-blue font-display flex items-center gap-1.5">
                    <span>💌 Book a Playdate</span>
                  </h3>
                  
                  {/* Returning vs New toggler inside booking card */}
                  <button
                    type="button"
                    onClick={() => {
                      const isRet = !whitneyParent.isReturningUser;
                      setWhitneyParent({ ...whitneyParent, isReturningUser: isRet });
                      addAuditLog(`Toggled ${whitneyParent.name || "Whitney"} Profile State`, "SYSTEM", `Configured ${whitneyParent.name || "Whitney"} as a ${isRet ? "RETURNING" : "NEW"} TTP user.`);
                    }}
                    className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full border-2 transition-all ${
                      whitneyParent.isReturningUser
                        ? "bg-ttp-green text-white border-ttp-green shadow-xs"
                        : "bg-white text-ttp-brown/85 border-ttp-beige hover:bg-stone-50"
                    }`}
                  >
                    {whitneyParent.isReturningUser ? "Returning parent • Overlap check ✨" : "New user • Cold invite 👤"}
                  </button>
                </div>

                {/* Friend inputs */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-ttp-brown mb-1">Friend's Parent First Name</label>
                      <input
                        type="text"
                        value={whitneyParent.name.split(/\s+/)[0] || ""}
                        onChange={(e) => {
                          const nameParts = whitneyParent.name.trim().split(/\s+/);
                           const lastName = nameParts.slice(1).join(" ") || "";
                           setWhitneyParent({ ...whitneyParent, name: `${e.target.value.trim()} ${lastName}`.trim() });
                        }}
                        onBlur={(e) => logFieldSubmission("Friend's Parent First Name", e.target.value)}
                        className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all"
                        placeholder="e.g. Whitney"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-ttp-brown mb-1">Friend's Parent Last Name</label>
                      <input
                        type="text"
                        value={whitneyParent.name.split(/\s+/).slice(1).join(" ") || ""}
                        onChange={(e) => {
                          const nameParts = whitneyParent.name.trim().split(/\s+/);
                          const firstName = nameParts[0] || "";
                          setWhitneyParent({ ...whitneyParent, name: `${firstName} ${e.target.value.trim()}`.trim() });
                        }}
                        onBlur={(e) => logFieldSubmission("Friend's Parent Last Name", e.target.value)}
                        className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all"
                        placeholder="e.g. Parent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-ttp-brown mb-1">Child's Name</label>
                    <input
                      type="text"
                      value={whitneyParent.childName}
                      onChange={(e) => setWhitneyParent({ ...whitneyParent, childName: e.target.value })}
                      onBlur={(e) => logFieldSubmission("Friend's Child's Name", e.target.value)}
                      className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all"
                      placeholder="e.g. Lily"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ttp-brown mb-1">Parent Phone Number (10 digits, numbers only)</label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={10}
                    value={whitneyParent.phone}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setWhitneyParent({ ...whitneyParent, phone: clean });
                    }}
                    onBlur={(e) => logFieldSubmission("Friend's Parent Phone Number", e.target.value)}
                    className="w-full text-xs font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all"
                    placeholder="e.g. 7205550143"
                  />
                </div>

                {/* Select meeting spot from Ranked Favorites */}
                <div className="flex flex-col gap-2 border-t border-ttp-beige/60 pt-3.5">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-ttp-blue font-sans">
                    📍 Choose Playdate Spot (From Onboarding Ranked Favorites):
                  </label>
                  
                  {preferences.favoriteLocations && preferences.favoriteLocations.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {preferences.favoriteLocations.map((loc, idx) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setSelectedLocation(loc);
                            addAuditLog("Selected Location for Playdate booking", "SYSTEM", `Audra chose location: '${loc}' (Rank #${idx + 1})`);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                            selectedLocation === loc
                              ? "bg-ttp-coral text-white border-ttp-coral shadow-3xs"
                              : "bg-stone-50/50 text-ttp-brown border-ttp-beige hover:bg-stone-100/80"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📍</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold leading-normal">{loc}</span>
                              <span className={`${selectedLocation === loc ? "text-white/80" : "text-ttp-brown/50"} text-[8.5px] font-bold uppercase tracking-wider`}>
                                Rank #{idx + 1} Spot
                              </span>
                            </div>
                          </div>
                          {selectedLocation === loc && (
                            <span className="w-5 h-5 rounded-full bg-white text-ttp-coral flex items-center justify-center text-xs font-extrabold shadow-3xs">
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-ttp-beige p-3 text-center bg-stone-50 rounded-xl">
                      <p className="text-xs text-ttp-brown/65 italic font-bold">No favorite spots configured.</p>
                      <button
                        onClick={() => setCurrentStep("audra_onboarding")}
                        className="text-[10px] text-ttp-pink underline mt-1 font-bold"
                      >
                        Click here to add spots in onboarding
                      </button>
                    </div>
                  )}
                </div>

                {/* Simulation logic description */}
                <div className="text-[10.5px] text-ttp-brown bg-stone-50 p-3 rounded-2xl border border-ttp-beige">
                  <div className="flex items-center gap-1.5 mb-1 text-[9.5px] font-bold text-ttp-blue uppercase tracking-wide">
                    <Info className="w-4 h-4 text-ttp-pink shrink-0" />
                    <span>How This Integration Works:</span>
                  </div>
                  {whitneyParent.isReturningUser 
                    ? `Time to Play matches ${preferences.childName}'s top free slots instantly with ${whitneyParent.name}'s saved preferences. No manual outreach required!` 
                    : `We'll generate a personalized invitation link. When ${whitneyParent.name} receives it, she can rank her top times instantly in a frictionless portal.`
                  }
                </div>

                {/* Primary plan action trigger */}
                <button
                  type="button"
                  onClick={handleInitiatePlaydate}
                  className="w-full bg-ttp-coral hover:bg-ttp-coral/95 text-white rounded-2xl py-3.5 font-bold text-xs tracking-wide shadow flex items-center justify-center gap-1.5 transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4 text-ttp-yellow fill-ttp-yellow" />
                  <span>Plan Playdate & Generate Link</span>
                </button>
              </div>

              {/* Preferences Settings overview button */}
              <button
                type="button"
                onClick={() => setCurrentStep("audra_onboarding")}
                className="w-full text-center text-xs text-ttp-brown/85 hover:text-ttp-coral bg-white font-bold py-3 border-2 border-ttp-beige rounded-2xl transition-all shadow-3xs"
              >
                ⚙️ View & Modify My Profile / Scheduling Preferences
              </button>
            </motion.div>
          )}

          {/* STEP 3: PROPOSAL DISPLAY APPROVAL SCREEN & PENDING STATE */}
          {(currentStep === "audra_proposal" || 
            currentStep === "whitney_sms_received" || 
            currentStep === "whitney_sms_confirmed" || 
            currentStep === "whitney_web_preferences" || 
            currentStep === "whitney_web_success"
          ) && activeProposal && (
            <motion.div
              key="proposal-review"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-4 flex flex-col gap-4"
            >
              <div>
                {currentStep !== "audra_proposal" && (
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#BA3A87] bg-ttp-coral/10 px-2.5 py-1 rounded-full border border-ttp-coral/20 inline-block font-display">
                    ⌛ Invite Sent & Tracking
                  </span>
                )}
                <h2 className="text-xl font-bold mt-1 text-ttp-blue font-display leading-tight">
                  {currentStep === "audra_proposal" ? "Your Next Playdate" : `Pending ${whitneyParent.name}'s RSVP`}
                </h2>
                {currentStep !== "audra_proposal" && (
                  <p className="text-xs text-ttp-brown/80 mt-0.5 font-medium">
                    We sent the invitation webpage link to {whitneyParent.name}. Track live activity below.
                  </p>
                )}
              </div>

              {/* Single Proposal Frame */}
              <div className="bg-white rounded-3xl border-2 border-ttp-coral shadow-md p-5 pb-6 flex flex-col gap-3 relative">
                {/* Visual Accent */}
                {currentStep !== "audra_proposal" && (
                  <div className="absolute right-3.5 top-3.5 h-7 w-7 rounded-full bg-ttp-yellow flex items-center justify-center text-xs shadow-xs font-bold scale-100 animate-float">
                    ✉️
                  </div>
                )}

                <div className="flex flex-col gap-3 text-left pr-10 pt-1">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4.5 h-4.5 text-ttp-pink shrink-0" />
                    <div>
                      <p className="text-base text-ttp-brown/70 font-semibold uppercase tracking-wider">Day & Date</p>
                      <p className="text-sm font-bold text-ttp-blue">{activeProposal.dayText}, {activeProposal.dateText}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-ttp-green shrink-0" />
                    <div>
                      <p className="text-base text-ttp-brown/70 font-semibold uppercase tracking-wider">Play Time</p>
                      <p className="text-sm font-bold text-ttp-blue">{activeProposal.timeText}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4.5 h-4.5 text-lg flex items-center justify-center shrink-0">📍</div>
                    <div>
                      <p className="text-base text-ttp-brown/70 font-semibold uppercase tracking-wider">Meeting Location</p>
                      <p className="text-sm font-bold text-ttp-blue">{activeProposal.locationText}</p>
                    </div>
                  </div>

                  {!MOCK_CALENDAR_EVENTS.some((e: any) => e.affectsSlot === activeProposal.slotIdUsed) && (
                    <div className="flex items-center gap-2">
                      <Star className="w-4.5 h-4.5 text-ttp-yellow fill-ttp-yellow shrink-0" />
                      <div>
                        <p className="text-base text-ttp-brown/70 font-semibold uppercase tracking-wider">Calendar Status</p>
                        <p className="text-sm font-bold text-ttp-blue font-semibold">No Calendar Conflicts</p>
                      </div>
                    </div>
                  )}
                </div>

                {currentStep === "audra_proposal" && (
                  <button
                    type="button"
                    onClick={handleRemixProposal}
                    title="Shuffle Proposal"
                    className="absolute bottom-4 right-4 h-11 w-11 rounded-full flex items-center justify-center bg-ttp-yellow hover:bg-yellow-400 text-ttp-blue shadow-md border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                  >
                    <Shuffle className="w-5 h-5 text-current" />
                  </button>
                )}
              </div>

              {/* Invite a Friend Card */}
              {currentStep === "audra_proposal" && !inviteGenerated && (
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-xs flex flex-col gap-3.5">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-ttp-blue font-display flex items-center gap-1.5 border-b border-stone-100 pb-2">
                      <span>✉️ Invite a Friend</span>
                    </h3>
                    
                    {!inviteGenerated ? (
                      <>
                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-xs text-ttp-brown/60 uppercase tracking-wider font-extrabold">Child's Name</label>
                          <input
                            type="text"
                            disabled={inviteGenerated}
                            value={whitneyParent.childName}
                            onChange={(e) => setWhitneyParent({ ...whitneyParent, childName: e.target.value })}
                            className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                            placeholder="e.g. Lily"
                          />
                        </div>

                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-xs text-ttp-brown/60 uppercase tracking-wider font-extrabold">Parent Name (Optional)</label>
                          <input
                            type="text"
                            disabled={inviteGenerated}
                            value={whitneyParent.name}
                            onChange={(e) => setWhitneyParent({ ...whitneyParent, name: e.target.value })}
                            className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                            placeholder="e.g. Whitney"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-left py-1 text-xs text-ttp-brown/80 font-bold">
                        Inviting <span className="text-[#BA3A87] font-black">{whitneyParent.childName}</span> (Parent: {whitneyParent.name || "Optional"})
                      </div>
                    )}
                  </div>

                  {!inviteGenerated && (
                    <>
                      {/* Card: Let us text you about your playdates */}
                      <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-xs flex flex-col gap-3.5">
                        <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#BA3A87] font-display flex items-center gap-1.5 border-b border-stone-100 pb-2">
                          <span>Let us text you about your playdates 💬</span>
                        </h3>
                        
                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-xs text-ttp-brown/60 uppercase tracking-wider font-extrabold">Your Phone Number (10 digits, numbers only)</label>
                          <input
                            type="text"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={10}
                            value={preferences.parentPhone || ""}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setPreferences({ ...preferences, parentPhone: clean });
                            }}
                            className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue"
                            placeholder="e.g. 7205550120"
                          />
                        </div>

                        <div className="flex flex-col gap-3.5 py-1 text-left">
                          {/* Checkbox 1: Terms */}
                          <label 
                            className="flex items-start gap-2.5 cursor-pointer group select-none"
                          >
                            <input
                              type="checkbox"
                              checked={inviteAgreedTerms}
                              onChange={(e) => setInviteAgreedTerms(e.target.checked)}
                              className="mt-0.5 rounded border-ttp-beige text-[#BA3A87] focus:ring-[#BA3A87]/30 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-[10px] leading-normal font-semibold text-ttp-brown/85 group-hover:text-ttp-brown transition-colors">
                              I agree to create a Time to Play account and accept the <a href="https://www.timetoplayscheduler.com/privacy-policy-v1" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline hover:text-[#BA3A87] font-bold">Privacy Policy</a> and <a href="https://www.timetoplayscheduler.com/terms-conditions-v1" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline hover:text-[#BA3A87] font-bold">Terms of Service</a>. I consent to receive automated operational and transactional text messages for my account and invite updates. Message frequency depends on my account activity. Msg & data rates may apply. Reply STOP to opt out, HELP for assistance.
                            </span>
                          </label>

                          {/* Checkbox 2: Marketing */}
                          <label 
                            className="flex items-start gap-2.5 cursor-pointer group select-none border-t border-stone-100 pt-3"
                          >
                            <input
                              type="checkbox"
                              checked={inviteAgreedMarketing}
                              onChange={(e) => setInviteAgreedMarketing(e.target.checked)}
                              className="mt-0.5 rounded border-ttp-beige text-[#BA3A87] focus:ring-[#BA3A87]/30 h-4 w-4 cursor-pointer"
                            />
                            <span className="text-[10px] leading-normal font-semibold text-ttp-brown/85 group-hover:text-ttp-brown transition-colors">
                              Check this box to also receive marketing offers, promotions, and special deals from Time to Play. Consent to marketing is not required to use our service. My mobile information will not be shared with third parties for marketing purposes. Reply STOP to cancel marketing texts at any time.
                            </span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {!inviteGenerated && (
                    <button
                      type="button"
                      disabled={!inviteAgreedTerms}
                      onClick={() => {
                        trackClick?.("Button_Audra_Generate_Proposal");
                        if (!whitneyParent.childName.trim()) {
                          alert("Please enter your friend's child's name!");
                          return;
                        }
                        const cleanParentPhone = (preferences.parentPhone || "").replace(/\D/g, "");
                        if (cleanParentPhone.length !== 10) {
                          alert("Please enter a valid 10-digit phone number (digits only, e.g. 7205550120) under 'Let us text you about your playdates'!");
                          return;
                        }
                        if (!inviteAgreedTerms) {
                          alert("Please check the box to agree to the Terms and consent schema before generating the invite!");
                          return;
                        }
                        setInviteGenerated(true);
                        addAuditLog("Generated Invite Link", "SYSTEM", `Generated a tailored playdate invite link for ${whitneyParent.childName}'s parent.`);
                      }}
                      className={`w-full bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white rounded-2xl py-3.5 font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
                        !inviteAgreedTerms ? "opacity-40 cursor-not-allowed hover:bg-[#BA3A87]" : "cursor-pointer"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-ttp-yellow fill-ttp-yellow" />
                      <span>Create Account and Generate Invite</span>
                    </button>
                  )}
                </div>
              )}

              {/* Copyable SMS Invite Block (Only visible after generation) */}
              {currentStep === "audra_proposal" && inviteGenerated && (
                <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-2.5">
                  <span className="text-sm font-extrabold uppercase text-[#BA3A87] tracking-wider">💬 Shareable Text Message:</span>
                  <div className="bg-stone-50 border border-ttp-beige text-sm font-semibold text-ttp-brown leading-relaxed p-3 rounded-2xl select-none focus:outline-none">
                    Hey! Let's get {preferences.childName || "Emma"} and {whitneyParent.childName || "Lily"} together for a playdate! How does {activeProposal.dayText}, {activeProposal.dateText} at {activeProposal.timeText} at {activeProposal.locationText} sound? Tap here to confirm or pick another time: <span className="text-ttp-blue font-bold break-all underline">https://ttp.play/p/{(whitneyParent.childName || "Lily").toLowerCase()}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons & Status depending on stage */}
              <div className="flex flex-col gap-2 mt-2">
                {currentStep === "audra_proposal" ? (
                  <>
                    {inviteGenerated && (
                      <button
                        type="button"
                        onClick={() => {
                          trackClick?.("Button_Audra_Share_Link");
                          onTriggerEarlyAccess?.();
                        }}
                        className="w-full bg-ttp-blue hover:bg-ttp-blue/95 text-white py-3.5 rounded-2xl font-bold text-xs tracking-wide shadow transition-all flex items-center justify-center gap-2 active:scale-98"
                      >
                        <ChevronRight className="w-4 h-4" />
                        <span>Share- Send to Friend</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setCurrentStep("audra_onboarding");
                        setInviteGenerated(false);
                      }}
                      className="w-full text-ttp-brown bg-ttp-grey bg-opacity-40 hover:bg-opacity-70 text-xs font-bold py-3.5 rounded-2xl transition border-2 border-dashed border-ttp-beige/70"
                    >
                      ← Go Back & Edit Proposal
                    </button>
                  </>
                ) : currentStep === "whitney_sms_confirmed" ? (
                  /* Prompt Audra to Confirm alternative time proposed by Whitney */
                  <div className="bg-white rounded-3xl border-2 border-ttp-pink p-5 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-ttp-grey">
                      <span className="text-2xl animate-bounce">🔔</span>
                      <div className="text-left">
                        <h3 className="text-xs font-black text-[#BA3A87] uppercase tracking-wide">RSVP Counter-Proposal Received</h3>
                        <p className="text-[10px] font-semibold text-ttp-brown/65">{whitneyParent.name || "Whitney"} suggested another time</p>
                      </div>
                    </div>
                    
                    <div className="bg-pink-50/50 border border-ttp-pink/20 p-3.5 rounded-2xl text-left">
                      <p className="text-xs text-ttp-brown/90 leading-relaxed font-semibold">
                        <strong>{whitneyParent.name || "Whitney"}</strong> shuffled through your preferred slots and found a time she likes:
                      </p>
                      <div className="mt-3 flex flex-col gap-2 bg-white p-3.5 rounded-2xl border border-ttp-beige shadow-3xs">
                        <p className="text-xs text-ttp-brown font-semibold flex items-center gap-1.5">
                          <span className="text-sm">📅</span> 
                          <span>Date: <span className="font-extrabold text-[#BA3A87]">{activeProposal.dayText}, {activeProposal.dateText}</span></span>
                        </p>
                        <p className="text-xs text-ttp-brown font-semibold flex items-center gap-1.5">
                          <span className="text-sm">⏰</span> 
                          <span>Time: <span className="font-extrabold text-[#BA3A87]">{activeProposal.timeText}</span></span>
                        </p>
                        <p className="text-xs text-ttp-brown font-semibold flex items-center gap-1.5">
                          <span className="text-sm">📍</span> 
                          <span>Park: <span className="font-extrabold text-[#BA3A87]">{activeProposal.locationText}</span></span>
                        </p>
                      </div>
                      <p className="text-[10px] text-stone-500 font-semibold mt-3 leading-relaxed">
                        ✨ Since this is from your original approved schedule range, tap Confirm to synchronize both calendars immediately.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full">
                      <button
                        onClick={() => {
                          // Confirm shuffled alternative playdate
                          addAuditLog(`${parentFirstName || "Audra"} Approved Counterposed Time`, "CALENDAR", `${parentFirstName || "Audra"} approved Whitney's alternative selection: ${activeProposal.dayText}, ${activeProposal.dateText} @ ${activeProposal.timeText}`);
                          addAuditLog(`Emailed calendar invites`, "CALENDAR", `Sent calendar invite for ${activeProposal.dayText} @ ${activeProposal.timeText} to ${(parentFirstName || "Audra").toLowerCase()}@example.com & ${whitneyParent.phone || "whitney.parent@gmail.com"}`);
                          setCurrentStep("playdate_fully_locked");
                        }}
                        className="w-full bg-ttp-green hover:bg-ttp-green/95 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition active:scale-95 cursor-pointer"
                      >
                        Approve & Confirm
                      </button>
                      <button
                        onClick={() => {
                          // Decline
                          addAuditLog(`${parentFirstName || "Audra"} Declined Suggested Time`, "SYSTEM", `${parentFirstName || "Audra"} declined Whitney's suggestion for ${activeProposal.dayText} @ ${activeProposal.timeText}`);
                          setCurrentStep("audra_onboarding");
                        }}
                        className="w-full bg-white hover:bg-stone-50 text-ttp-pink border-2 border-ttp-pink/50 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer text-center"
                      >
                        Decline (Reset Flow)
                      </button>
                    </div>
                  </div>
                ) : (
                  // PENDING VISIBILITY FLOW ON HOST'S APP
                  <div className="bg-white rounded-3xl border-2 border-ttp-beige p-4 flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-ttp-grey pb-2.5">
                      <span className="text-[10px] font-extrabold text-ttp-blue font-display uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-ttp-coral animate-ping"></span>
                        <span>Activity Tracker</span>
                      </span>
                      <span className="bg-ttp-coral/10 text-ttp-coral text-[9px] font-black px-2.5 py-0.5 rounded-full border border-ttp-coral/15 animate-pulse">
                        PENDING ANSWER
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 text-left">
                      <div className="flex items-start gap-2.5 text-xs">
                        <div className="w-5 h-5 rounded-full bg-ttp-green text-white flex items-center justify-center font-bold text-[10px] shrink-0">✓</div>
                        <div>
                          <p className="font-bold text-ttp-blue leading-normal">Invite Crafted</p>
                          <p className="text-[10px] text-ttp-brown/70 font-semibold">Saved top {preferences.childName || "Emma"}'s timeslot convenience list.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <div className="w-5 h-5 rounded-full bg-ttp-green text-white flex items-center justify-center font-bold text-[10px] shrink-0">✓</div>
                        <div>
                          <p className="font-bold text-ttp-blue leading-normal">Text Link Dispatched</p>
                          <p className="text-[10px] text-ttp-brown/70 font-semibold">{whitneyParent.name} invited at {whitneyParent.phone || "720-555-0143"}.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 text-xs">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          currentStep !== "whitney_sms_received"
                            ? "bg-ttp-green text-white"
                            : "bg-ttp-yellow text-ttp-blue border border-ttp-yellow-40 animate-pulse font-black"
                        }`}>
                          {currentStep !== "whitney_sms_received" ? "✓" : "⌛"}
                        </div>
                        <div>
                          <p className="font-bold text-ttp-blue leading-normal">
                            {currentStep !== "whitney_sms_received" ? "Link Viewed" : "Awaiting Guest Action"}
                          </p>
                          <p className="text-[10px] text-ttp-brown/70 font-semibold">
                            {currentStep !== "whitney_sms_received" 
                              ? `${whitneyParent.name || "Whitney"} opened the schedule invitation.` 
                              : `Sent text is waiting for ${whitneyParent.name || "Whitney"} to read...`}
                          </p>
                        </div>
                      </div>

                      {(currentStep === "whitney_web_preferences" || currentStep === "whitney_web_success") && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            currentStep === "whitney_web_success"
                              ? "bg-ttp-green text-white"
                              : "bg-ttp-yellow text-ttp-blue border border-ttp-yellow-40 animate-pulse font-black"
                          }`}>
                            {currentStep === "whitney_web_success" ? "✓" : "⌛"}
                          </div>
                          <div>
                            <p className="font-bold text-ttp-blue leading-normal">
                              {currentStep === "whitney_web_success" ? "Preferences Submitted!" : "Choosing Preferred Times"}
                            </p>
                            <p className="text-[10px] text-ttp-brown/70 font-semibold">
                              {currentStep === "whitney_web_success"
                                ? `${whitneyParent.name || "Whitney"} submitted weekend convenience blocks.`
                                : `${whitneyParent.name || "Whitney"} is picking her top times inside the portal...`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep("audra_onboarding")}
                      className="mt-2 w-full text-ttp-brown bg-ttp-grey bg-opacity-40 hover:bg-opacity-70 text-xs font-bold py-2.5 rounded-xl transition border border-ttp-beige"
                    >
                      ← Withdraw & Edit Proposal
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SIMULATION STEP FOR PARENTS FULLY LOCKED */}
          {currentStep === "playdate_fully_locked" && (
            <motion.div
              key="fully-locked"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="p-4 flex flex-col gap-5 text-center"
            >
              <div className="w-16 h-16 bg-ttp-green/15 text-ttp-green rounded-full flex items-center justify-center mx-auto text-2xl animate-float">
                🎉
              </div>

              <div>
                <h2 className="text-xl font-bold text-ttp-blue font-display leading-tight">Confirmed!</h2>
                <p className="text-xs text-ttp-brown mt-1 font-semibold">
                  Invite added to both host and guest calendars. No text saga needed!
                </p>
              </div>

              {/* Mock Google Calendar invite block */}
              <div className="bg-white border-2 border-ttp-beige rounded-3xl p-4 shadow-3xs text-left">
                <div className="flex items-center gap-2 border-b-2 border-ttp-grey pb-2.5 mb-2.5">
                  <div className="w-6 h-6 bg-ttp-blue/10 rounded-lg text-ttp-blue flex items-center justify-center text-[10px] font-black">31</div>
                  <span className="text-xs font-extrabold text-ttp-blue font-display uppercase tracking-wide">Calendar Invite</span>
                </div>

                <h4 className="text-xs font-bold text-ttp-blue font-display">{preferences.childName} & {whitneyParent.childName}: Playdate 🎈</h4>
                <p className="text-[11px] text-ttp-brown/90 font-semibold mt-0.5">{activeProposal?.dayText}, {activeProposal?.dateText} at {activeProposal?.timeText}</p>
                <p className="text-[10px] text-ttp-brown/70 font-semibold mt-1">📍 {activeProposal?.locationText}</p>

                <div className="mt-3.5 pt-2.5 border-t-2 border-ttp-grey/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-ttp-green"></span>
                    <span className="text-[10px] text-ttp-blue font-bold">{parentFirstName || "Audra"} (Host)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-ttp-green animate-pulse"></span>
                    <span className="text-[10px] text-ttp-blue font-bold">{whitneyParent.name || "Whitney"} (Matched)</span>
                  </div>
                </div>
              </div>

              {/* Reset simulator Button */}
              <button
                onClick={resetSimulation}
                className="w-full bg-ttp-coral hover:bg-ttp-coral/95 font-bold text-xs py-3.5 text-white rounded-2xl shadow transition mt-2 active:scale-98"
              >
                Reset & Try {whitneyParent.name} "Another Time"
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* iOS Share Sheet Overlay */}
      <AnimatePresence>
        {showIosShareSheet && (
          <div className="absolute inset-0 z-40 flex flex-col justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/40 transition-opacity" 
              onClick={() => setShowIosShareSheet(false)}
            />
            
            {/* iOS Share Sheet Container */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-[#f2f2f7] rounded-t-3xl z-50 p-4.5 pb-7 flex flex-col gap-4.5 shadow-2xl relative border-t border-stone-200"
            >
              {/* Drag handle */}
              <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-1 shrink-0" />
              
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-stone-200/50 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-stone-200 text-lg shadow-3xs">
                    🎈
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-stone-800">Time to Play Invite Link</h4>
                    <p className="text-[10px] text-stone-500 font-semibold break-all max-w-[200px] truncate">
                      https://ttp.play/p/{(whitneyParent.childName || "Lily").toLowerCase()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowIosShareSheet(false)}
                  className="w-7 h-7 rounded-full bg-stone-200/70 hover:bg-stone-200 flex items-center justify-center text-stone-600 font-black text-[10px] transition"
                >
                  ✕
                </button>
              </div>

              {/* Suggested Contacts (Row 1) */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-bold text-stone-400 text-left uppercase tracking-wider pl-1 font-sans">Suggested Contacts</span>
                <div className="flex gap-4 overflow-x-auto py-1 no-scrollbar text-center">
                  {/* Whitney - TARGET */}
                  <button
                    type="button"
                    onClick={() => {
                      trackClick?.("Button_Audra_Send_SMS_Invite");
                      handleSendProposal();
                      setShowIosShareSheet(false);
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 group relative focus:outline-none"
                  >
                    <div className="relative">
                      {/* Pulsing ring indicator */}
                      <div className="absolute -inset-1 rounded-full border-2 border-ttp-coral animate-ping opacity-75" />
                      <div className="w-13 h-13 rounded-full bg-orange-100 border border-orange-200/50 flex items-center justify-center text-xl shadow-xs font-black text-orange-700 relative z-10">
                        👩‍👦
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-ttp-green text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white text-[9px] font-black z-20">
                        💬
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-stone-700 mt-1 max-w-[70px] truncate leading-tight block">
                      {whitneyParent.childName || "Lily"}'s Mom
                    </span>
                    <span className="text-[8px] font-extrabold text-ttp-coral uppercase block tracking-wide animate-pulse">
                      Tap to Send
                    </span>
                  </button>

                  {/* Dummy Contact 1: Aunt Sarah */}
                  <div className="flex flex-col items-center gap-1 shrink-0 opacity-40">
                    <div className="w-13 h-13 rounded-full bg-blue-100 flex items-center justify-center text-xl text-blue-700 font-black">
                      👩‍🦰
                    </div>
                    <span className="text-[9px] font-bold text-stone-600 mt-1 max-w-[60px] truncate leading-tight">
                      Aunt Sarah
                    </span>
                  </div>

                  {/* Dummy Contact 2: Uncle Henry */}
                  <div className="flex flex-col items-center gap-1 shrink-0 opacity-40">
                    <div className="w-13 h-13 rounded-full bg-purple-100 flex items-center justify-center text-xl text-purple-700 font-black">
                      👨
                    </div>
                    <span className="text-[9px] font-bold text-stone-600 mt-1 max-w-[60px] truncate leading-tight">
                      Henry K.
                    </span>
                  </div>

                  {/* Dummy Contact 3: Play Sandbox Group */}
                  <div className="flex flex-col items-center gap-1 shrink-0 opacity-40">
                    <div className="w-13 h-13 rounded-full bg-[#fde047]/60 flex items-center justify-center text-xl text-yellow-700 font-black">
                      🦖
                    </div>
                    <span className="text-[9px] font-bold text-stone-600 mt-1 max-w-[60px] truncate leading-tight">
                      Moms Group
                    </span>
                  </div>
                </div>
              </div>


            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
