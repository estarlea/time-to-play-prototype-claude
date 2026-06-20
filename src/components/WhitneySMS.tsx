import React, { useState } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { logFieldSubmission } from "../lib/googleForm";
import { 
  ProposalState, 
  OtherParent, 
  SimulatedStep, 
  TimeSlotId, 
  PlaydatePreferences 
} from "../types";
import { PRESET_LOTS, calculateMutualOverlapProposal, MOCK_CALENDAR_EVENTS, getSlotDateTime, formatSlotDateTime, calculateBestProposal } from "../data";
import { PlaydateKidsLogo } from "./AudraApp";
import { 
  Send, 
  Globe, 
  CheckSquare, 
  Square, 
  Calendar,
  AlertCircle,
  Plus,
  GripVertical,
  Sparkles,
  Check,
  ChevronRight,
  Minus,
  Shuffle,
  RotateCcw
} from "lucide-react";

interface WhitneySMSProps {
  activeProposal: ProposalState | null;
  setActiveProposal?: React.Dispatch<React.SetStateAction<ProposalState | null>>;
  whitneyParent: OtherParent;
  setWhitneyParent: React.Dispatch<React.SetStateAction<OtherParent>>;
  audraPrefs: PlaydatePreferences;
  currentStep: SimulatedStep;
  setCurrentStep: (step: SimulatedStep) => void;
  addAuditLog: (event: string, category: "AI" | "CALENDAR" | "SMS" | "SYSTEM", description: string) => void;
  setFinishedStep?: (isFinished: boolean) => void;
  onFullyLocked: () => void;
  trackClick?: (buttonId: string) => void;
  resetSimulation?: () => void;
}

export default function WhitneySMS({
  activeProposal,
  setActiveProposal,
  whitneyParent,
  setWhitneyParent,
  audraPrefs,
  currentStep,
  setCurrentStep,
  addAuditLog,
  onFullyLocked,
  trackClick,
  resetSimulation
}: WhitneySMSProps) {
  const hostParentName = audraPrefs?.parentName && audraPrefs.parentName.trim() ? audraPrefs.parentName.trim().split(/\s+/)[0] : "Audra";

  const [chatMessages, setChatMessages] = useState<Array<{ sender: "TTP" | "USER"; text: string; link?: boolean; isIcs?: boolean }>>([]);
  const [customInput, setCustomInput] = useState("");
  const [smsFlowState, setSmsFlowState] = useState<"not_started" | "received_proposal" | "replied_yes" | "replied_another" | "email_responded" | "success">("not_started");

  // Portal State properties
  const [guestViewMode, setGuestViewMode] = useState<"proposal_review" | "set_preferences" | "direct_confirm_success">("proposal_review");
  const [confirmEmailInput, setConfirmEmailInput] = useState("whitney.parent@gmail.com");
  const [showDirectEmailField, setShowDirectEmailField] = useState(false);
  const [tcAccepted, setTcAccepted] = useState(false);
  const [smsConsentAccepted, setSmsConsentAccepted] = useState(false);
  const [whitneyRanked, setWhitneyRanked] = useState<TimeSlotId[]>(["sat_afternoon", "sun_afternoon"]);
  const [whitneyAfterSchoolTime, setWhitneyAfterSchoolTime] = useState<"3:00 PM" | "4:00 PM" | "5:00 PM">("4:00 PM");
  const [whitneyCalendarBlockerActive, setWhitneyCalendarBlockerActive] = useState(false);
  const [whitneyCalendarEmail, setWhitneyCalendarEmail] = useState("ParentCalendarEmail@gmail.com");
  const [guestLocation, setGuestLocation] = useState("");
  const [showPortalLoader, setShowPortalLoader] = useState(false);
  const [whitneyShuffledTimes, setWhitneyShuffledTimes] = useState(false);

  // Whitney 3-screen onboarding state
  const [whitneyOnboardingSubPage, setWhitneyOnboardingSubPage] = useState(1);
  const [whitneyCadence, setWhitneyCadence] = useState(4);
  const [whitneyFavoriteLocations, setWhitneyFavoriteLocations] = useState<string[]>([
    "",
    "your place",
    "local playground"
  ]);

  const [onboardingParentFirstName, setOnboardingParentFirstName] = useState("");
  const [onboardingParentLastName, setOnboardingParentLastName] = useState("");
  const onboardingParentName = `${onboardingParentFirstName.trim()} ${onboardingParentLastName.trim()}`.trim();
  const [onboardingParentPhone, setOnboardingParentPhone] = useState("");
  const [onboardingChildName, setOnboardingChildName] = useState("");

  React.useEffect(() => {
    if (currentStep === "audra_onboarding") {
      setOnboardingParentFirstName("");
      setOnboardingParentLastName("");
      setOnboardingParentPhone("");
      setOnboardingChildName("");
      setWhitneyCadence(4);
      setWhitneyOnboardingSubPage(1);
      setWhitneyShuffledTimes(false);
    } else if (currentStep.startsWith("whitney_")) {
      if (whitneyParent.name) {
        const parts = whitneyParent.name.trim().split(/\s+/);
        setOnboardingParentFirstName(parts[0] || "");
        setOnboardingParentLastName(parts.slice(1).join(" ") || "");
      }
      if (whitneyParent.childName) {
        setOnboardingChildName(whitneyParent.childName);
      }
      if (whitneyParent.phone) {
        setOnboardingParentPhone(whitneyParent.phone);
      }
    }
  }, [currentStep]);

  React.useEffect(() => {
    if (activeProposal?.locationText) {
      setGuestLocation(activeProposal.locationText);
    }
  }, [activeProposal]);

  // Trigger when Audra sends a proposal
  React.useEffect(() => {
    if (currentStep === "whitney_sms_received" && activeProposal) {
      setChatMessages([
        {
          sender: "TTP",
          text: `Hey! Let's get ${audraPrefs.childName || "Emma"} and ${whitneyParent.childName || "Lily"} together for a playdate! How does ${activeProposal.dayText}, ${activeProposal.dateText} at ${activeProposal.timeText} at ${activeProposal.locationText} sound? Tap here to confirm or pick another time: https://ttp.play/p/${(whitneyParent.childName || "Lily").toLowerCase()}`,
          link: true
        }
      ]);
      setSmsFlowState("received_proposal");
       addAuditLog(`Sent SMS to ${whitneyParent.name || "Whitney"}`, "SMS", `Proposal text dispatched: ${activeProposal.dayText}, ${activeProposal.dateText} @ ${activeProposal.timeText}`);
    }
  }, [currentStep, activeProposal]);

  const handleCustomSend = (textToSend?: string) => {
    const text = textToSend || customInput;
    if (!text.trim()) return;

    const newMsgs = [...chatMessages, { sender: "USER" as const, text }];
    setChatMessages(newMsgs);
    setCustomInput("");
    addAuditLog(`${whitneyParent.name || "Whitney"} SMS Response`, "SMS", `${whitneyParent.name || "Whitney"} replied: "${text}"`);

    // Basic auto-response parsing
    setTimeout(() => {
      if (smsFlowState === "received_proposal") {
        setChatMessages(prev => [
          ...prev,
          { 
            sender: "TTP", 
            text: `Hey! I'm so excited for the kids to hang out. Could you tap the link in the message above to see the invite and confirm? Or here it is again: https://ttp.play/p/${(whitneyParent.childName || "Lily").toLowerCase()}`, 
            link: true 
          }
        ]);
        addAuditLog(`${hostParentName} Automated Response`, "SMS", `Reminded ${whitneyParent.name || "Whitney"} to use the portal link.`);
      } else if (smsFlowState === "replied_yes") {
        // Assume email address input
        setSmsFlowState("success");
        setChatMessages(prev => [
          ...prev,
          { sender: "TTP", text: "Perfect, invite dispatched! Check your calendar inboxes. Can't wait! 🎮" }
        ]);
        addAuditLog(`Emailed calendar invites`, "CALENDAR", `Sent calendar invite for ${activeProposal?.dayText} @ ${activeProposal?.timeText} to ${hostParentName.toLowerCase()}@example.com & ${text}`);
        
        // Complete flow in 4.5 seconds to give user time to view/click download
        setTimeout(() => {
          onFullyLocked();
        }, 4500);
      }
    }, 800);
  };

  const handlePortalToggleSlot = (slotId: TimeSlotId) => {
    trackClick?.("Button_Whitney_Rank_Slot");
    const nextR = [...whitneyRanked];
    const idx = nextR.indexOf(slotId);
    if (idx > -1) {
      nextR.splice(idx, 1);
    } else {
      if (nextR.length < 5) {
        nextR.push(slotId);
      } else {
        nextR[4] = slotId;
      }
    }
    setWhitneyRanked(nextR);
  };

  // Submit preferences inside portal
  const handlePortalSubmit = (customLocation?: string) => {
    if (!onboardingParentPhone || !onboardingParentPhone.trim()) {
      alert("Please enter your phone number under 'Let us text you about your playdates' to receive account and invite updates!");
      return;
    }
    if (!tcAccepted) {
      alert("Please check the box to agree to the Terms and consent schema before continuing!");
      return;
    }
    if (whitneyRanked.length === 0) {
      alert("Please select at least 1 playdate preference to continue!");
      return;
    }
    setShowPortalLoader(true);

    // Save Guest preferences and inputted details in parent system state
    setWhitneyParent(prev => ({
      ...prev,
      name: onboardingParentName || prev.name,
      phone: onboardingParentPhone || prev.phone,
      childName: onboardingChildName || prev.childName,
      preferences: {
        rankedSlots: whitneyRanked,
        afterSchoolTime: whitneyAfterSchoolTime
      }
    }));

    addAuditLog(`${onboardingParentName || "Whitney"} Coordinates Updated`, "SYSTEM", `Guest preferences: ${whitneyRanked.map(s => s.split('_').join(' ')).join(', ')} (After school: ${whitneyAfterSchoolTime})`);

    const finalLocation = customLocation !== undefined ? customLocation : guestLocation;

    // Calculate mathematically solid mutual overlap!
    const { proposal, log } = calculateMutualOverlapProposal(
      audraPrefs,
      whitneyRanked,
      whitneyAfterSchoolTime,
      whitneyCalendarBlockerActive,
      whitneyCalendarEmail,
      finalLocation
    );

    if (setActiveProposal) {
      setActiveProposal(proposal);
    }

    setTimeout(() => {
      setShowPortalLoader(false);
      setCurrentStep("whitney_web_success");
      
      // Feed step-by-step overlap resolution logs to the audit trace
      log.forEach(item => {
        const cat = item.includes("📅") || item.includes("⚠️") ? "CALENDAR" : (item.includes("🔍") || item.includes("🏆") || item.includes("✨") || item.includes("⚖️") ? "AI" : "SYSTEM");
        addAuditLog(item.replace(/[^\w\s\-\:\'\.\,\(\)\/]/gi, '').trim(), cat, "Multi-Parent Overlap analysis calculation completed.");
      });
    }, 1200);
  };

  // Lock mutual slot
  const handleLockMutualSlot = () => {
    trackClick?.("Button_Whitney_Confirm_Playdate");
    const timeStr = activeProposal 
      ? `${activeProposal.dayText} (${activeProposal.dateText}) @ ${activeProposal.timeText}`
      : "Saturday afternoon @ 2:00 PM";
    addAuditLog(`Synchronized Mutual Calendars`, "CALENDAR", `Created mutual sync invitation for ${timeStr}`);
    onFullyLocked();
  };

  const handleShuffleAudraOptions = () => {
    if (!activeProposal) return;
    
    // Get valid slots from Audra's preferences and extend with PRESET_LOTS so Whitney can always shuffle
    let list = [...audraPrefs.rankedSlots];
    PRESET_LOTS.forEach(p => {
      if (!list.includes(p.id)) {
        list.push(p.id);
      }
    });
    
    // Filter calendar blocker if active
    if (audraPrefs.calendarBlockerActive) {
      const blockedSlots = MOCK_CALENDAR_EVENTS
        .filter((e: any) => e.affectsSlot !== null)
        .map((e: any) => e.affectsSlot as TimeSlotId);
      list = list.filter(s => !blockedSlots.includes(s));
    }
    
    // Filter 36 hours lead time
    let now = new Date(2026, 5, 16, 16, 34, 19);
    const minTimeNeeded = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    list = list.filter(s => getSlotDateTime(s, audraPrefs.afterSchoolTime) >= minTimeNeeded);
    
    if (list.length === 0) {
      // Fallback to all PRESET_LOTS that are valid if preferred list is empty or blocked
      list = PRESET_LOTS.map(p => p.id).filter(s => getSlotDateTime(s, audraPrefs.afterSchoolTime) >= minTimeNeeded);
    }
    
    // Find current index
    const currentIndex = list.indexOf(activeProposal.slotIdUsed);
    const nextIndex = (currentIndex + 1) % list.length;
    const nextSlot = list[nextIndex] || activeProposal.slotIdUsed;
    
    const { day, time } = formatSlotDateTime(nextSlot, audraPrefs.afterSchoolTime);
    
    const updatedProposal: ProposalState = {
      ...activeProposal,
      dayText: day.split(" (")[0],
      dateText: day.includes("(") ? day.split(" (")[1].replace(")", "") : "June 20",
      timeText: time,
      slotIdUsed: nextSlot,
    };
    
    if (setActiveProposal) {
      setActiveProposal(updatedProposal);
    }
    
    setWhitneyShuffledTimes(true);
    addAuditLog(`${whitneyParent.name || "Whitney"} Shuffled Playdate Option`, "AI", `Whitney shuffled proposal to ${hostParentName}'s slot: ${nextSlot.split('_').join(' ')}`);
  };

  const handleRevertToAudraOriginal = () => {
    const { proposal } = calculateBestProposal(audraPrefs, whitneyParent);
    const updatedProposal: ProposalState = {
      ...proposal,
      locationText: (audraPrefs.favoriteLocations && audraPrefs.favoriteLocations[0]) || `${audraPrefs.childName || "Emma"}'s place`
    };
    if (setActiveProposal) {
      setActiveProposal(updatedProposal);
    }
    setWhitneyShuffledTimes(false);
    addAuditLog(`${whitneyParent.name || "Whitney"} Reverted Playdate`, "SYSTEM", `Whitney reverted the proposal to ${hostParentName}'s original preferred slot.`);
  };

  const handleDirectConfirmSubmit = () => {
    trackClick?.("Button_Whitney_Confirm_Playdate");
    setShowPortalLoader(true);
    if (whitneyShuffledTimes) {
      addAuditLog(`${whitneyParent.name || "Whitney"} Selected Shuffled Slot`, "SYSTEM", `Alternative playdate choice accepted: ${activeProposal?.dayText}, ${activeProposal?.dateText} at ${activeProposal?.timeText}. Launching host confirmation request.`);
      setTimeout(() => {
        setShowPortalLoader(false);
        setGuestViewMode("direct_confirm_success");
        setCurrentStep("whitney_sms_confirmed");
      }, 1200);
    } else {
      addAuditLog(`${whitneyParent.name || "Whitney"} Confirmed Proposal`, "SYSTEM", `Approved direct proposed playdate for ${activeProposal?.dayText}, ${activeProposal?.dateText} at ${activeProposal?.timeText}`);
      addAuditLog(`Emailed calendar invites`, "CALENDAR", `Sent calendar invite for ${activeProposal?.dayText} @ ${activeProposal?.timeText} to audra@example.com & ${confirmEmailInput}`);

      // Save email in parent state
      setWhitneyParent(prev => ({
        ...prev,
        email: confirmEmailInput
      }));

      setTimeout(() => {
        setShowPortalLoader(false);
        setGuestViewMode("direct_confirm_success");
        onFullyLocked();
      }, 1200);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 font-sans text-ttp-brown">
      
      {/* 1. SMS VIEW */}
      {currentStep === "whitney_sms_received" && (
        <div className="flex flex-col h-full bg-slate-50">
          
          {/* Messages Header */}
          <div className="bg-ttp-grey backdrop-blur px-4 py-3 border-b-2 border-ttp-beige flex items-center justify-between z-30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-ttp-pink text-white font-bold text-xs flex items-center justify-center font-display">
                👩‍👦
              </div>
              <div>
                <p className="text-xs font-black text-ttp-blue leading-tight">720-555-0120 ({hostParentName} - {audraPrefs.childName || "Emma"}'s Mom)</p>
                <span className="text-[9px] text-ttp-brown/80 font-bold uppercase tracking-wider">iMessage / SMS</span>
              </div>
            </div>
            <span className="text-[9px] text-ttp-pink bg-white px-2 py-0.5 rounded-full border border-ttp-pink/20 font-bold">SMS</span>
          </div>

          {/* Message Thread */}
          <div className="flex-1 p-3 overflow-y-auto phone-scroll flex flex-col gap-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <AlertCircle className="w-8 h-8 text-ttp-beige mb-2" />
                <p className="text-xs text-ttp-brown font-bold">Awaiting proposal from {hostParentName}'s phone...</p>
                <p className="text-[10px] text-ttp-brown/70 mt-1 max-w-[200px] leading-relaxed">Send the proposal from the left phone to see this screen light up.</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isTtp = msg.sender === "TTP";
                return (
                  <div key={idx} className={`flex flex-col ${isTtp ? "items-start" : "items-end"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed font-sans shadow-2xs ${
                      isTtp 
                        ? "bg-white text-ttp-brown rounded-tl-none border-2 border-ttp-beige" 
                        : "bg-ttp-blue text-white rounded-tr-none"
                    }`}>
                      {msg.text}

                      {/* Display SMS interactive link */}
                      {msg.link && (
                        <button
                          onClick={() => {
                            trackClick?.("Button_Whitney_Open_SMS");
                            setGuestViewMode("proposal_review");
                            setShowDirectEmailField(false);
                            setCurrentStep("whitney_web_preferences");
                          }}
                          className="mt-3 block w-full bg-ttp-coral hover:bg-ttp-coral/95 text-white p-2.5 rounded-xl text-[10px] font-black text-center shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 duration-150"
                        >
                          <Globe className="w-3.5 h-3.5 text-ttp-yellow fill-ttp-yellow" />
                          <span>Tap here to view playdate proposal</span>
                        </button>
                      )}

                    </div>
                    <span className="text-[9px] text-ttp-brown/50 mt-1 px-1 font-mono">
                      {isTtp ? hostParentName : (whitneyParent.name || "Whitney")}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick-Action Presets buttons representing physical user behavior */}
          {chatMessages.length > 0 && (
            <div className="p-3 border-t-2 border-ttp-beige bg-white flex flex-col gap-2 shrink-0">
              
              {smsFlowState === "received_proposal" && (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      trackClick?.("Button_Whitney_Open_SMS");
                      setGuestViewMode("proposal_review");
                      setShowDirectEmailField(false);
                      setCurrentStep("whitney_web_preferences");
                      addAuditLog(`Whitney simulated open portal`, "SYSTEM", "Whitney tapped the SMS invitation link.");
                    }}
                    className="w-full bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white py-3 rounded-xl text-xs font-black tracking-wide shadow-md hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Globe className="w-4 h-4 text-ttp-yellow fill-ttp-yellow" />
                    <span>🌐 Tap Link to View Playdate Invite</span>
                  </button>
                </div>
              )}

              {/* Chat Text Input field */}
              <div className="flex items-center gap-1.5 mt-1">
                <input
                  type="text"
                  placeholder="Type custom SMS reply..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSend()}
                  disabled={smsFlowState === "success"}
                  className="flex-1 text-xs border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-blue bg-stone-50 font-semibold"
                />
                <button
                  onClick={() => handleCustomSend()}
                  disabled={smsFlowState === "success" || !customInput.trim()}
                  className="bg-ttp-blue text-white p-2 rounded-xl disabled:opacity-40 transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. WEB PORTAL VIEW (ANOTHER TIME PATH) */}
      {(currentStep === "whitney_web_preferences" || currentStep === "whitney_sms_confirmed") && (
        <div className="flex flex-col h-full bg-slate-50 font-sans">
          
          {/* Browser Bar */}
          <div className="bg-ttp-brown text-white px-3 py-2 text-[10px] flex items-center justify-between shrink-0 font-mono">
            <span className="opacity-80">🔒 ttp.play/p/{(whitneyParent.name || "Whitney").toLowerCase()}</span>
            <span className="bg-white/10 text-white font-bold px-1.5 py-0.5 rounded text-[8px] uppercase font-sans">
              {currentStep === "whitney_sms_confirmed" ? "Pending Approval" : "Portal"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto phone-scroll p-4 flex flex-col gap-4.5 bg-slate-50 relative">
            
            {/* Direct Portal Loader Cover */}
            <AnimatePresence>
              {showPortalLoader && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-5 text-center"
                >
                  <span className="text-3xl animate-bounce">⚡</span>
                  <p className="text-sm font-bold text-ttp-blue mt-3 font-display animate-pulse">Running Dynamic Playdate Overlap Algebra...</p>
                  <p className="text-sm text-ttp-brown/75 max-w-[200px] text-center mt-1.5 leading-relaxed font-semibold">
                    Scanning host and guest calendars to avoid mutual scheduling load.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {guestViewMode === "proposal_review" && (
              <>
                {/* Playful Welcome Header Hero Box */}
                <div className="text-center py-4 bg-[#BA3A87]/10 rounded-3xl border-2 border-dashed border-[#BA3A87]/25 px-3">
                  <h1 className="text-xl font-extrabold tracking-tight text-ttp-blue font-display leading-tight">
                    Hey {whitneyParent.name || "Whitney"}!
                  </h1>
                  <p className="text-xs font-semibold text-ttp-brown/85 mt-1 px-3">
                    You've received a Playdate invitation from <strong>{hostParentName} ({audraPrefs.childName || "Emma"}'s Mom)</strong>!
                  </p>
                </div>

                {/* Proposed Playdate Card */}
                <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-sm flex flex-col gap-3.5 relative">
                  <div className="flex items-center gap-2 border-b-2 border-ttp-beige/60 pb-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <h2 className="text-sm font-black text-ttp-blue uppercase tracking-wide">Playdate Invite</h2>
                      <p className="text-[11px] text-ttp-brown/60 font-semibold">{audraPrefs.childName || "Emma"} & {whitneyParent.childName || "Lily"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm bg-stone-100 p-1.5 rounded-lg shrink-0">📅</span>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-ttp-brown/50 leading-none mb-0.5 font-display">Day & Date</span>
                        <span className="text-sm font-black text-ttp-blue">
                          {activeProposal?.dayText || "Saturday"}, {activeProposal?.dateText || "June 20"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-sm bg-stone-100 p-1.5 rounded-lg shrink-0">⏰</span>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-ttp-brown/50 leading-none mb-0.5 font-display">Play Hour</span>
                        <span className="text-sm font-black text-ttp-blue">
                          {activeProposal?.timeText || "10:00 AM"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="text-sm bg-stone-100 p-1.5 rounded-lg shrink-0">📍</span>
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-ttp-brown/50 leading-none mb-0.5 font-display">Location</span>
                        <span className="text-sm font-black text-ttp-blue">
                          {activeProposal?.locationText || `${audraPrefs.childName || "Emma"}'s place`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Rewind Button for Whitney to revert to Audra's original preference */}
                  <button
                    type="button"
                    onClick={handleRevertToAudraOriginal}
                    title="Revert to Audra's original preference"
                    className="absolute bottom-4 right-[68px] h-11 w-11 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-[#BA3A87] shadow-md border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  {/* Shuffle Button for Whitney to shuffle through Audra's options */}
                  <button
                    type="button"
                    onClick={handleShuffleAudraOptions}
                    title="Shuffle through Audra's alternative preferred times"
                    className="absolute bottom-4 right-4 h-11 w-11 rounded-full flex items-center justify-center bg-ttp-yellow hover:bg-yellow-400 text-ttp-blue shadow-md border-2 border-white hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse animate-none"
                  >
                    <Shuffle className="w-5 h-5 text-current animate-spin-slow-once" />
                  </button>
                </div>

                {/* Confirm & Suggest Options */}
                {showDirectEmailField ? (
                  <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ttp-blue font-display uppercase tracking-wide mb-1">
                        📬 Your Email for Calendar Invite
                      </label>
                      <input
                        type="email"
                        value={confirmEmailInput}
                        onChange={(e) => setConfirmEmailInput(e.target.value)}
                        className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-3 py-2.5 bg-stone-50 focus:bg-white focus:outline-none focus:border-[#BA3A87] transition duration-150"
                        placeholder="e.g. whitney.parent@gmail.com"
                      />
                    </div>

                    <button
                      onClick={handleDirectConfirmSubmit}
                      className="w-full bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
                    >
                      <span>Confirm and invite {audraPrefs.childName || "Emma"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        trackClick?.("Button_Whitney_Alternative_Yes");
                        setShowDirectEmailField(true);
                      }}
                      className="w-full bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white py-4 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm and invite {audraPrefs.childName || "Emma"}</span>
                    </button>

                    <p style={{ fontSize: "16px" }} className="text-center font-semibold text-ttp-brown/85 leading-relaxed mt-1 p-1">
                      Share your playdate preferences to find a time and avoid the back-and-forth comparing calendar chaos.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        trackClick?.("Button_Whitney_Alternative_No");
                        setGuestViewMode("set_preferences");
                        setWhitneyOnboardingSubPage(1);
                        addAuditLog(`Whitney clicked Suggest Another Time`, "SYSTEM", "Switched from proposed playdate to preferred play times matrix selection.");
                      }}
                      className="w-full bg-white hover:bg-stone-50 text-ttp-pink border-2 border-ttp-pink/55 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all"
                    >
                      ⏰ Suggest Another Time
                    </button>
                  </div>
                )}
              </>
            )}

            {(guestViewMode === "direct_confirm_success" || currentStep === "whitney_sms_confirmed") && (
              <div className="flex flex-col gap-4">
                {currentStep === "whitney_sms_confirmed" ? (
                  /* Counterproposal Sent Card */
                  <div className="bg-white rounded-3xl p-6 border-2 border-ttp-beige shadow-sm flex flex-col gap-4 text-center items-center justify-center py-8">
                    <span className="text-3xl animate-bounce">⚡</span>
                    <div>
                      <h3 className="text-lg font-black text-ttp-blue font-display leading-tight">Playdate Invite Sent</h3>
                      <p className="text-xs text-ttp-brown/85 mt-2 font-semibold leading-relaxed px-2">
                        You picked alternative hours from {hostParentName}'s options. Waiting for {hostParentName} to approve this time!
                      </p>
                    </div>

                    <div className="w-full bg-[#BA3A87]/5 border-2 border-[#BA3A87]/25 p-4 rounded-3xl text-left flex flex-col gap-2">
                      <p className="text-xs text-ttp-brown">🗓️ Suggested Day: <span className="font-bold text-ttp-blue">{activeProposal?.dayText || "Saturday"}, {activeProposal?.dateText || "June 20"}</span></p>
                      <p className="text-xs text-ttp-brown font-semibold">⏰ Suggested Time: <span className="font-bold text-ttp-blue">{activeProposal?.timeText || "12:00 PM"}</span> </p>
                      <p className="text-xs text-ttp-brown font-semibold">📍 Meeting Park: <span className="font-bold text-[#BA3A87] font-black">{activeProposal?.locationText || `${audraPrefs.childName || "Emma"}'s place`}</span></p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        resetSimulation?.();
                        addAuditLog("Reset for New Preferences Process 🌟", "SYSTEM", "Restarted playdate onboarding flow from the beginning.");
                      }}
                      className="w-full bg-[#0B4283] hover:bg-[#0B4283]/95 text-white py-3.5 rounded-2xl font-bold text-xs tracking-wide shadow transition mt-2 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Set Playdate Preferences
                    </button>
                  </div>
                ) : (
                  /* Playdate Confirmed Card */
                  <div className="bg-white rounded-3xl p-6 border-2 border-ttp-beige shadow-sm flex flex-col gap-4 text-center items-center justify-center py-8">
                    <div>
                      <h3 className="text-xl font-black text-ttp-blue font-display leading-tight">It's a Playdate</h3>
                      <p className="text-xs text-ttp-brown/85 mt-1 font-semibold leading-relaxed px-2">
                        You're all set! We sent you both a calendar invite.
                      </p>
                    </div>

                    <div className="w-full bg-[#BA3A87]/5 border-2 border-[#BA3A87]/25 p-4 rounded-3xl text-left flex flex-col gap-2">
                      <p className="text-xs text-ttp-brown">🗓️ Day & Date: <span className="font-bold text-ttp-blue">{activeProposal?.dayText || "Saturday"}, {activeProposal?.dateText || "June 20"}</span></p>
                      <p className="text-xs text-ttp-brown font-semibold">⏰ Play Hour: <span className="font-bold text-ttp-blue">{activeProposal?.timeText || "10:00 AM"}</span> </p>
                      <p className="text-xs text-ttp-brown font-semibold">📍 Meeting Park: <span className="font-bold text-ttp-blue">{activeProposal?.locationText || `${audraPrefs.childName || "Emma"}'s place`}</span></p>
                    </div>
                  </div>
                )}

                {/* Set Preferences Incentive Card */}
                {currentStep !== "whitney_sms_confirmed" && (
                  <div className="bg-white rounded-3xl p-6 border-2 border-ttp-beige shadow-sm flex flex-col gap-3 text-center items-center justify-center">
                    <p className="text-center font-semibold text-ttp-brown/85 leading-snug mt-1" style={{ fontSize: "14px" }}>
                      Set your preferred playdate times for one-click playdates in the future.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGuestViewMode("set_preferences");
                        setWhitneyOnboardingSubPage(1);
                        addAuditLog(`Whitney clicked Set My Playdate Times`, "SYSTEM", "Navigating to calendar preferences matrix to set regular weekly slots.");
                      }}
                      className="w-full bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition"
                    >
                      Set My Playdate Times
                    </button>
                  </div>
                )}
              </div>
            )}

            {guestViewMode === "set_preferences" && (
              <>
                 {/* Playful Welcome Header Hero Box */}
                <div className="text-center py-3 bg-ttp-coral/10 rounded-3xl border-2 border-dashed border-ttp-coral/25 px-3">
                  <h1 className="text-xl font-extrabold tracking-tight text-ttp-blue font-display leading-tight">
                    {whitneyOnboardingSubPage === 1 && "Family Profile Info"}
                    {whitneyOnboardingSubPage === 2 && "Set Your Playdate Times"}
                    {whitneyOnboardingSubPage === 3 && "Set Playdate Locations"}
                  </h1>
                  <p className="text-sm uppercase tracking-wider font-extrabold text-[#BA3A87] mt-0.5 animate-none">
                    Step {whitneyOnboardingSubPage} of 3
                  </p>
                </div>

            {/* PAGE 1: FAMILY PROFILE INFO */}
            {whitneyOnboardingSubPage === 1 && (
              <div className="flex flex-col gap-4">
                {/* Profiles Setup */}
                <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-ttp-blue font-display flex items-center gap-1.5">
                    <span>👪 Family Info</span>
                  </h2>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-bold text-ttp-brown mb-1 uppercase tracking-wider text-left">Parent First Name</label>
                        <input
                          type="text"
                          value={onboardingParentFirstName}
                          onChange={(e) => setOnboardingParentFirstName(e.target.value)}
                          onBlur={(e) => logFieldSubmission("Whitney First Name", e.target.value)}
                          className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue font-sans"
                          placeholder="e.g. Whitney"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-ttp-brown mb-1 uppercase tracking-wider text-left">Parent Last Name</label>
                        <input
                          type="text"
                          value={onboardingParentLastName}
                          onChange={(e) => setOnboardingParentLastName(e.target.value)}
                          onBlur={(e) => logFieldSubmission("Whitney Last Name", e.target.value)}
                          className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-ttp-coral/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue font-sans"
                          placeholder="e.g. Parent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-ttp-brown mb-1 uppercase tracking-wider text-left">Your Child's Name</label>
                      <input
                        type="text"
                        value={onboardingChildName}
                        onChange={(e) => setOnboardingChildName(e.target.value)}
                        onBlur={(e) => logFieldSubmission("Whitney Child's Name", e.target.value)}
                        className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/85 bg-stone-50 focus:bg-white transition-all text-ttp-blue font-sans"
                        placeholder="e.g. Lily"
                      />
                    </div>
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
                          setWhitneyCadence(cadence);
                          addAuditLog("Set Guest Playdate Cadence", "SYSTEM", `Whitney configured ideal frequency to ${cadence} playdates per month.`);
                        }}
                        className={`flex-1 text-sm py-3 rounded-xl border-2 font-bold transition-all ${
                          whitneyCadence === cadence
                            ? "bg-[#BA3A87] text-white border-[#BA3A87] shadow-3xs"
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

                {/* Stepper navigation page 1 */}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGuestViewMode("proposal_review")}
                    className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 border-2 border-ttp-beige flex items-center justify-center text-ttp-brown/80 shadow-xs transition-all active:scale-95"
                    title="Back"
                  >
                    <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackClick?.("Button_Whitney_Next_Onboarding_Slide1");
                      if (!onboardingParentName.trim() || !onboardingChildName.trim()) {
                        alert("Please fill in both parent and child names first!");
                        return;
                      }
                      setWhitneyParent(prev => ({
                        ...prev,
                        name: onboardingParentName,
                        phone: onboardingParentPhone,
                        childName: onboardingChildName
                      }));
                      setWhitneyOnboardingSubPage(2);
                      addAuditLog("Pushed Stepper Page", "SYSTEM", "Whitney completed page 1 info and navigated to onboarding page 2 (preferred times)");
                    }}
                    className="flex-1 bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 transition-all text-sans"
                  >
                    <span>Continue to Play Times</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}

            {/* PAGE 2: PLAY TIMES SETUP */}
            {whitneyOnboardingSubPage === 2 && (
              <div className="flex flex-col gap-4">
                {/* Section 2: Preferences Slots (Replicated from Audra Onboarding) */}
                <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-ttp-blue font-display">⏰ Weekly Play Times & Priority</h2>
              </div>
              <p className="text-sm font-medium text-ttp-brown/80 leading-snug">
                Select up to 5 times. Tap a card to add/remove, and <strong>hold and drag</strong> to reorder your priority!
              </p>

              <div className="flex flex-col gap-3 mt-1">
                
                {/* Drag-reorder interactive blocks */}
                {whitneyRanked.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm uppercase tracking-wider font-extrabold text-ttp-blue/70 block mb-0.5 font-display">My Priority (Drag to Reorder):</span>
                    <Reorder.Group
                      axis="y"
                      values={whitneyRanked}
                      onReorder={(newOrder) => {
                        setWhitneyRanked(newOrder);
                        addAuditLog(`Reordered Play Times (${whitneyParent.name || "Whitney"})`, "SYSTEM", `${whitneyParent.name || "Whitney"} rearranged preference ranks: ${newOrder.map(id => PRESET_LOTS.find(p => p.id === id)?.label).join(", ")}`);
                      }}
                      className="flex flex-col gap-1.5"
                    >
                      {whitneyRanked.map((slotId) => {
                        const slot = PRESET_LOTS.find((p) => p.id === slotId);
                        if (!slot) return null;
                        const rankIndex = whitneyRanked.indexOf(slotId);
                        return (
                          <Reorder.Item
                            key={slotId}
                            value={slotId}
                            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 bg-ttp-yellow/15 border-ttp-yellow text-ttp-blue font-bold shadow-3xs cursor-grab active:cursor-grabbing select-none touch-none"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePortalToggleSlot(slotId);
                              }}
                              className="w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-ttp-coral bg-ttp-coral text-white text-xs font-black shrink-0 hover:bg-ttp-coral/80 hover:border-ttp-coral/80 transition-colors"
                              title="Remove time"
                            >
                              -
                            </button>

                            <div className="flex flex-col text-left flex-1 min-w-0">
                              <span className="text-sm font-black truncate">{slot.label}</span>
                              <span className="text-sm text-ttp-brown/65 font-semibold truncate">
                                {slot.category === "weekend" ? slot.defaultTime : "Afternoon"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pr-0.5 select-none">
                              <span className="w-5.5 h-5.5 rounded-full flex items-center justify-center bg-ttp-yellow text-ttp-blue text-[11px] font-black border border-ttp-yellow-40 shadow-2xs">
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
                    <p className="text-sm font-bold text-ttp-brown/60 italic">No preferred times selected.</p>
                    <p className="text-sm text-ttp-brown/50 mt-0.5 font-medium">Tap play times below to prioritize {whitneyParent.childName || "Lily"}'s availability.</p>
                  </div>
                )}

                {/* Addable available play blocks */}
                {PRESET_LOTS.filter(s => !whitneyRanked.includes(s.id)).length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t-2 border-dashed border-ttp-beige/60 pt-3">
                    <span className="text-sm uppercase tracking-wider font-extrabold text-ttp-brown/70 block mb-0.5 font-display">Available Play Times (Tap to Add):</span>
                    <div className="flex flex-col gap-1.5">
                      {PRESET_LOTS.filter(s => !whitneyRanked.includes(s.id)).map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handlePortalToggleSlot(slot.id)}
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

              {/* Conditional after-school convenience times */}
              {whitneyRanked.some(s => s.endsWith("afterschool")) && (
                <div className="border-t-2 border-ttp-grey pt-3 mt-1 flex flex-col gap-1.5">
                  <label className="block text-sm font-bold text-ttp-brown">
                    Typical after school hour convenience:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["3:00 PM", "4:00 PM", "5:00 PM"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setWhitneyAfterSchoolTime(t as any)}
                        className={`text-sm py-2 rounded-xl border-2 font-bold transition ${
                          whitneyAfterSchoolTime === t
                            ? "bg-ttp-coral text-white border-ttp-coral animate-pulse"
                            : "bg-white text-ttp-brown border-ttp-beige hover:bg-stone-50"
                        }`}
                      >
                        {t}+
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Calendar Blocker (Replicated from Audra Onboarding) */}
            <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-ttp-blue" />
                  <span className="text-sm font-extrabold text-ttp-blue font-display uppercase tracking-wide">🗓️ Compare Calendars</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whitneyCalendarBlockerActive}
                    onChange={() => {
                      const nextVal = !whitneyCalendarBlockerActive;
                      setWhitneyCalendarBlockerActive(nextVal);
                      addAuditLog(`${nextVal ? "Connected" : "Disconnected"} Calendar Link (${whitneyParent.name || "Whitney"})`, "CALENDAR", `Guest option for automated scheduling filters updated.`);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-ttp-coral"></div>
                </label>
              </div>
              
              <p className="text-sm text-ttp-brown/80 font-medium leading-normal">
                When turned on, Time to Play will not suggest times that overlap with your calendar events.
              </p>

              {whitneyCalendarBlockerActive && (
                <div className="flex flex-col gap-3 border-t-2 border-ttp-grey pt-3 mt-1">
                  <div>
                    <label className="block text-sm font-extrabold uppercase tracking-wider text-ttp-blue font-display mb-1">Your Email for Calendar Invite</label>
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

            {/* Stepper navigation page 2 */}
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => {
                  setWhitneyOnboardingSubPage(1);
                  addAuditLog("Pushed Stepper Page", "SYSTEM", "Whitney navigated back to onboarding page 1");
                }}
                className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 border-2 border-ttp-beige flex items-center justify-center text-ttp-brown/80 shadow-xs transition-all active:scale-95 animate-none"
                title="Back"
              >
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  trackClick?.("Button_Whitney_Next_Onboarding_Slide2");
                  if (whitneyRanked.length === 0) {
                    alert("Please select at least one playdate time slot!");
                    return;
                  }
                  setWhitneyOnboardingSubPage(3);
                  addAuditLog("Pushed Stepper Page", "SYSTEM", "Whitney navigated to onboarding page 3 (locations and terms)");
                }}
                className="flex-1 bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-md flex items-center justify-center gap-1.5 transition-all font-sans animate-none"
              >
                <span>Continue to Locations</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}

            {/* PAGE 3: FAVORITE PLAYDATE SPOTS & TERMS */}
            {whitneyOnboardingSubPage === 3 && (
              <div className="flex flex-col gap-4 font-sans">
                
                {/* Favorite Locations Group */}
                <div className="bg-white rounded-3xl p-4 border-2 border-ttp-beige shadow-xs flex flex-col gap-3">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-ttp-blue font-display text-left">📍 Favorite Locations</h3>
                  <div className="flex flex-col gap-3 mt-1">
                    {[0, 1, 2].map((idx) => {
                      const labels = [
                        "1st Choice Spot (Preferred Default) ⭐",
                        "2nd Choice Spot 🏡",
                        "3rd Choice Spot 🌳"
                      ];
                      const placeholders = [
                        `${onboardingChildName || whitneyParent.childName || "Lily"}'s place`,
                        "your place",
                        "local playground"
                      ];
                      
                      const val = whitneyFavoriteLocations && whitneyFavoriteLocations[idx] !== undefined
                        ? whitneyFavoriteLocations[idx]
                        : "";

                      return (
                        <div key={idx} className="flex flex-col gap-1 text-left font-sans">
                          <label className="block text-sm font-bold text-ttp-brown">
                            {labels[idx]}
                          </label>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => {
                              const updated = [...(whitneyFavoriteLocations || [])];
                              for (let i = 0; i <= idx; i++) {
                                  if (updated[i] === undefined) {
                                    updated[i] = "";
                                  }
                                }
                                updated[idx] = e.target.value;
                                setWhitneyFavoriteLocations(updated);
                              }}
                              onBlur={(e) => logFieldSubmission(`Whitney Preferred Spot ${idx + 1}`, e.target.value)}
                              className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue font-sans animate-none"
                              placeholder={placeholders[idx] || `${onboardingChildName || whitneyParent.childName || "Lily"}'s place`}
                            />
                          </div>
                        );
                    })}
                  </div>
                </div>

                {/* Section 4: Consent, Terms and Conditions (Mandated by user request) */}
                <div className="bg-white rounded-3xl p-5 border-2 border-ttp-beige shadow-xs flex flex-col gap-3.5 text-left">
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#BA3A87] font-display flex items-center gap-1.5 border-b border-stone-100 pb-2">
                    <span>Let us text you about your playdates 💬</span>
                  </h3>
                  
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-xs text-ttp-brown/60 uppercase tracking-wider font-extrabold">Your Phone Number</label>
                    <input
                      type="text"
                      value={onboardingParentPhone}
                      onChange={(e) => setOnboardingParentPhone(e.target.value)}
                      onBlur={(e) => logFieldSubmission("Whitney Phone Number", e.target.value)}
                      className="w-full text-sm font-bold border-2 border-ttp-beige rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#BA3A87]/80 bg-stone-50 focus:bg-white transition-all text-ttp-blue font-sans animate-none"
                      placeholder="e.g. 720-555-0143"
                    />
                  </div>

                  <div className="flex flex-col gap-3.5 py-1 text-left">
                    {/* Checkbox 1: Terms */}
                    <label 
                      className="flex items-start gap-2.5 cursor-pointer group select-none"
                    >
                      <input
                        type="checkbox"
                        checked={tcAccepted}
                        onChange={(e) => setTcAccepted(e.target.checked)}
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
                        checked={smsConsentAccepted}
                        onChange={(e) => setSmsConsentAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-ttp-beige text-[#BA3A87] focus:ring-[#BA3A87]/30 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-[10px] leading-normal font-semibold text-ttp-brown/85 group-hover:text-ttp-brown transition-colors">
                        Check this box to also receive marketing offers, promotions, and special deals from Time to Play. Consent to marketing is not required to use our service. My mobile information will not be shared with third parties for marketing purposes. Reply STOP to cancel marketing texts at any time.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Stepper buttons (Final calculation) */}
                <div className="flex items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setWhitneyOnboardingSubPage(2);
                      addAuditLog("Pushed Stepper Page", "SYSTEM", "Whitney navigated back to onboarding page 2");
                    }}
                    className="w-12 h-12 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 border-2 border-ttp-beige flex items-center justify-center text-ttp-brown/80 shadow-xs transition-all active:scale-95 animate-none"
                    title="Back"
                  >
                    <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      trackClick?.("Button_Whitney_Next_Onboarding_Slide3");
                      trackClick?.("Button_Whitney_Complete_Onboarding");
                      const dynamicFallback = `${onboardingChildName || whitneyParent.childName || "Lily"}'s place`;
                      const validLocations = (whitneyFavoriteLocations || []).map((l, i) => {
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
                      if (!onboardingParentPhone || !onboardingParentPhone.trim()) {
                        alert("Please enter your phone number under 'Let us text you about your playdates' to receive account and invite updates!");
                        return;
                      }
                      if (!tcAccepted) {
                        alert("Please check the box to agree to the Terms and consent schema before continuing!");
                        return;
                      }
                      setGuestLocation(validLocations[0]);
                      handlePortalSubmit(validLocations[0]);
                    }}
                    disabled={!tcAccepted}
                    className={`flex-1 py-3.5 rounded-2xl text-sm font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-1.5 animate-none ${
                      tcAccepted
                        ? "bg-[#BA3A87] hover:bg-[#BA3A87]/95 text-white cursor-pointer active:scale-98" 
                        : "bg-ttp-grey text-ttp-brown/40 cursor-not-allowed border-2 border-ttp-beige"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-ttp-yellow fill-ttp-yellow animate-none" />
                    <span>Create Account and Generate Playdate</span>
                  </button>
                </div>
              </div>
            )}

            {/* Portal Loader Cover */}
            <AnimatePresence>
              {showPortalLoader && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-5 text-center"
                >
                  <span className="text-3xl animate-bounce">⚡</span>
                  <p className="text-sm font-bold text-ttp-blue mt-3 font-display animate-pulse">Running Dynamic Playdate Overlap Algebra...</p>
                  <p className="text-sm text-ttp-brown/75 max-w-[200px] text-center mt-1.5 leading-relaxed font-semibold">
                    Scanning host and guest calendars to avoid mutual scheduling load.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
              </>
            )}
          </div>
        </div>
      )}

      {/* 3. MUTUAL MATCH REPORT SUCCESS (ANOTHER TIME PORTAL END) */}
      {currentStep === "whitney_web_success" && (
        <div className="flex flex-col h-full bg-white font-sans text-center justify-center p-5 gap-4.5 relative">
          <div className="flex justify-center mb-1">
            <PlaydateKidsLogo />
          </div>

          <div>
            <h3 className="text-lg font-black mt-1 text-ttp-blue font-display leading-tight">We found a perfect overlap!</h3>
            <p className="text-xs text-ttp-brown/85 mt-1 font-semibold leading-relaxed px-2">
              Based on both your and {hostParentName}'s saved weekly availability profiles, TTP calculated:
            </p>
          </div>

          <div className="bg-ttp-grey/25 border-2 border-ttp-beige p-4 rounded-3xl text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ttp-blue font-display mb-2 border-b border-ttp-beige pb-1.5">
              <span>🗓️ Saturday Afternoon</span>
            </div>
            
            <p className="text-xs text-ttp-brown">🗓️ Day: <span className="font-bold text-ttp-blue">Saturday (June 20)</span></p>
            <p className="text-xs text-ttp-brown mt-1">⏰ Play Hour: <span className="font-bold text-ttp-blue">2:00 PM</span> </p>
            <p className="text-xs text-ttp-brown mt-1">📍 Meeting Park: <span className="font-bold text-ttp-blue">{activeProposal?.locationText || `${audraPrefs.childName || "Emma"}'s place`}</span></p>
            
            <div className="border-t-2 border-dashed border-ttp-beige/70 mt-3 pt-2.5">
              <p className="text-[10px] text-ttp-brown font-semibold leading-snug">
                ✨ <span className="text-ttp-green font-bold">Perfect overlap</span>: This slot has been matched perfectly. It ranks #1 in ${whitneyParent.name || "Whitney"}'s list and is fully cleared on {hostParentName}'s calendars!
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={handleLockMutualSlot}
              className="w-full bg-ttp-coral hover:bg-ttp-coral/95 text-white rounded-2xl py-3.5 font-bold text-xs shadow-md transition-all active:scale-98"
            >
              Lock in playdate & send invite
            </button>
            <button
              onClick={() => setCurrentStep("whitney_web_preferences")}
              className="text-xs text-ttp-pink hover:text-ttp-coral font-bold mt-1"
            >
              ← Edit My Preferences
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
