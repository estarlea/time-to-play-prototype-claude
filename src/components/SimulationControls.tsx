import React, { useState } from "react";
import { 
  SimulatedStep, 
  SystemAuditLog, 
  PlaydatePreferences, 
  OtherParent 
} from "../types";
import { 
  Info, 
  Wrench, 
  Terminal, 
  CheckCircle2, 
  ListRestart, 
  FileSpreadsheet, 
  LogOut, 
  RefreshCw, 
  Loader, 
  Database, 
  Search, 
  Trash, 
  Eye, 
  ShieldCheck, 
  Mail, 
  Lock, 
  UserCheck, 
  X, 
  Filter 
} from "lucide-react";
// Firebase removed — auth and database features disabled

interface SimulationControlsProps {
  currentStep: SimulatedStep;
  setCurrentStep: (step: SimulatedStep) => void;
  auditLogs: SystemAuditLog[];
  preferences: PlaydatePreferences;
  setPreferences: React.Dispatch<React.SetStateAction<PlaydatePreferences>>;
  whitneyParent: OtherParent;
  setWhitneyParent: React.Dispatch<React.SetStateAction<OtherParent>>;
  resetSimulation: () => void;
  clearLogs: () => void;
  onForceSync: (action: string) => Promise<void>;
  firestoreLeads: any[];
}

export default function SimulationControls({
  currentStep,
  setCurrentStep,
  auditLogs,
  preferences,
  setPreferences,
  whitneyParent,
  setWhitneyParent,
  resetSimulation,
  clearLogs,
  onForceSync,
  firestoreLeads
}: SimulationControlsProps) {

  // Secondary sub-tab panel selector
  const [activeTabPanel, setActiveTabPanel] = useState<"flow" | "database">("flow");

  // Email/Password states for fallback register/login
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Auth removed (Firebase replaced with Google Form)
  const currentFirebaseUser: any = null;

  // Firestore Lead Inspector states
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const hostName = preferences?.parentName && preferences.parentName.trim() ? preferences.parentName.trim().split(/\s+/)[0] : "Audra";

  const [copiedAudra, setCopiedAudra] = useState(false);
  const [copiedWhitney, setCopiedWhitney] = useState(false);
  const [copiedCombined, setCopiedCombined] = useState(false);

  const getStandaloneUrl = (view: "audra" | "whitney" | "combined") => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?view=${view}`;
  };

  const copyLink = async (view: "audra" | "whitney" | "combined") => {
    const url = getStandaloneUrl(view);
    try {
      await navigator.clipboard.writeText(url);
      if (view === "audra") {
        setCopiedAudra(true);
        setTimeout(() => setCopiedAudra(false), 2000);
      } else if (view === "whitney") {
        setCopiedWhitney(true);
        setTimeout(() => setCopiedWhitney(false), 2000);
      } else {
        setCopiedCombined(true);
        setTimeout(() => setCopiedCombined(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // Auth removed — stub kept for UI compatibility
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("Auth has been removed from this prototype.");
  };

  const handleSignOutFirebase = async () => {
    // Auth removed
  };

  const handleDeleteDoc = async (_leadId: string) => {
    // Database removed
  };

  const handleClearAllLeads = async () => {
    // Database removed
  };

  // Step state parameters
  const stepsList = [
    {
      id: "audra_onboarding" as SimulatedStep,
      title: "1. Create Playdate Proposal",
      desc: "Fill in names, choose location, and drag-to-rank preferred times."
    },
    {
      id: "audra_proposal" as SimulatedStep,
      title: "2. Share Invitation",
      desc: "Generate the customized invite and share with a friend."
    },
    {
      id: "whitney_sms_received" as SimulatedStep,
      title: "3. Simulated Guest SMS Link",
      desc: `Simulate ${whitneyParent.name || "Whitney"} receiving the text invite, clicking the link, and picking slots.`
    },
    {
      id: "playdate_fully_locked" as SimulatedStep,
      title: "4. Calendars Confirmed!",
      desc: "Both parent calendars synchronized. Confirmed playdate without the text back-and-forth!"
    }
  ];

  const getLogCategoryColor = (cat: "AI" | "CALENDAR" | "SMS" | "SYSTEM") => {
    switch (cat) {
      case "AI": return "text-[#f4da53] bg-[#f4da53]/10 border-[#f4da53]/30";
      case "CALENDAR": return "text-[#0B4283] bg-[#0B4283]/15 border-[#0B4283]/35";
      case "SMS": return "text-[#BA3A87] bg-[#BA3A87]/15 border-[#BA3A87]/35";
      case "SYSTEM": return "text-[#007F61] bg-[#007F61]/15 border-[#007F61]/35";
    }
  };

  // Leads filters applied logic
  const filteredLeads = firestoreLeads.filter(lead => {
    const term = searchQuery.toLowerCase();
    const actionMatch = lead.actionTriggered?.toLowerCase().includes(term) ||
      lead.audraName?.toLowerCase().includes(term) ||
      lead.whitneyName?.toLowerCase().includes(term) ||
      lead.currentPath?.toLowerCase().includes(term);

    if (filterAction === "all") return actionMatch;
    if (filterAction === "onboarding") return actionMatch && lead.actionTriggered?.toLowerCase().includes("onboarding");
    if (filterAction === "proposal") return actionMatch && lead.actionTriggered?.toLowerCase().includes("proposal");
    if (filterAction === "sms") return actionMatch && lead.actionTriggered?.toLowerCase().includes("sms");
    if (filterAction === "lock") return actionMatch && (lead.actionTriggered?.toLowerCase().includes("schedule confirmed") || lead.actionTriggered?.toLowerCase().includes("lock"));
    return actionMatch;
  });

  return (
    <div className="flex flex-col h-full bg-white border-2 border-ttp-beige rounded-3xl p-5 shadow-xs font-sans gap-4.5 relative">
      
      {/* Title Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-ttp-blue uppercase tracking-wider font-display">
          <Wrench className="w-4 h-4 text-ttp-coral" />
          <span>Interactive Playground Lab</span>
        </div>
        <h2 className="text-xl font-black text-ttp-blue font-display mt-0.5">Control Panel</h2>
        <p className="text-xs text-ttp-brown/80 mt-1 leading-relaxed font-semibold">
          Step through simulated states, toggle variables live, or audit automated algorithms.
        </p>
      </div>

      {/* Segmented Sub-Tab selector for Flow vs Database */}
      <div className="flex bg-stone-100 p-1 rounded-2xl border border-ttp-grey/45 shadow-3xs shrink-0">
        <button
          onClick={() => setActiveTabPanel("flow")}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabPanel === "flow"
              ? "bg-white text-ttp-blue shadow-3xs border border-ttp-grey/20"
              : "text-ttp-brown hover:text-black hover:bg-stone-50"
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-ttp-coral" />
          <span>Variables & flow</span>
        </button>
        <button
          onClick={() => setActiveTabPanel("database")}
          className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTabPanel === "database"
              ? "bg-white text-ttp-blue shadow-3xs border border-ttp-grey/20 animate-pulse-once"
              : "text-ttp-brown hover:text-black hover:bg-stone-50"
          }`}
        >
          <Database className="w-3.5 h-3.5 text-ttp-blue" />
          <span>Cloud database</span>
          {firestoreLeads.length > 0 && (
            <span className="bg-ttp-coral text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {firestoreLeads.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB PANEL 1: Variables and Simulated Flow states */}
      {activeTabPanel === "flow" && (
        <div className="flex flex-col gap-4">
          
          {/* State Switcher walkthrough flow */}
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-black text-ttp-pink uppercase tracking-widest font-display">Prototype Flow States:</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto phone-scroll pr-1">
              {stepsList.map((st) => {
                const isActive = currentStep === st.id || 
                  (st.id === "whitney_sms_received" && ["whitney_sms_confirmed", "whitney_web_preferences", "whitney_web_success"].includes(currentStep));
                return (
                  <div
                    key={st.id}
                    onClick={() => setCurrentStep(st.id)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border-2 text-left cursor-pointer transition-all ${
                      isActive
                        ? "bg-ttp-blue/5 border-ttp-blue shadow-2xs"
                        : "bg-stone-50/50 border-ttp-grey hover:bg-stone-50"
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${isActive ? "text-ttp-blue" : "text-ttp-beige"}`}>
                      {isActive ? <CheckCircle2 className="w-4 h-4 fill-ttp-blue/10" /> : <div className="w-4 h-4 rounded-full border-2 border-ttp-beige bg-white"></div>}
                    </div>
                    <div>
                      <h4 className={`text-xs font-black ${isActive ? "text-ttp-blue" : "text-ttp-brown"}`}>
                        {st.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-ttp-brown/70 leading-normal mt-0.5">{st.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simulator Variable Tweaker Controls */}
          <div className="bg-ttp-grey/25 rounded-3xl p-4 border-2 border-ttp-beige flex flex-col gap-2.5">
            <h3 className="text-xs font-black text-ttp-blue uppercase tracking-widest flex items-center gap-1.5 font-display">
              <Info className="w-4 h-4 text-ttp-pink" />
              <span>Interactive Variables</span>
            </h3>

            {/* Tweaker A: Calendar Blocker Overlap Toggle */}
            <div className="flex flex-col gap-2.5 bg-white p-3 rounded-xl border border-ttp-beige shadow-3xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ttp-blue">Simulate conflict blocker</p>
                  <p className="text-[10px] text-ttp-brown/70 font-semibold">Track Saturday morning sports block</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.calendarBlockerActive}
                    onChange={() => setPreferences({ ...preferences, calendarBlockerActive: !preferences.calendarBlockerActive })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-ttp-coral"></div>
                </label>
              </div>

              {preferences.calendarBlockerActive && (
                <div className="border-t border-ttp-grey/40 pt-2 flex flex-col gap-2">
                  <div>
                    <p className="text-[9px] font-extrabold uppercase text-ttp-blue font-display">Target Calendar Email</p>
                    <input
                      type="email"
                      value={preferences.calendarEmail}
                      onChange={(e) => setPreferences({ ...preferences, calendarEmail: e.target.value })}
                      className="w-full text-[11px] font-bold border border-ttp-beige rounded-lg px-2 py-1 bg-stone-50 focus:outline-none focus:border-ttp-coral text-ttp-brown"
                      placeholder="e.g. audra.parent@gmail.com"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tweaker B: Whitney fast path */}
            <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-ttp-beige shadow-3xs">
              <div>
                <p className="text-xs font-bold text-ttp-blue">Guest profile state</p>
                <p className="text-[10px] text-ttp-brown/70 font-semibold">Pre-stored preferences toggle</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setWhitneyParent({ ...whitneyParent, isReturningUser: false })}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-black border-2 transition-all ${
                    !whitneyParent.isReturningUser
                      ? "bg-ttp-coral border-ttp-coral text-white"
                      : "bg-white text-ttp-brown border-ttp-beige hover:bg-stone-50"
                  }`}
                >
                  New 👤
                </button>
                <button
                  onClick={() => setWhitneyParent({ ...whitneyParent, isReturningUser: true })}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-black border-2 transition-all ${
                    whitneyParent.isReturningUser
                      ? "bg-ttp-green border-ttp-green text-white"
                      : "bg-white text-ttp-brown border-ttp-beige hover:bg-stone-50"
                  }`}
                >
                  Returning ✨
                </button>
              </div>
            </div>
          </div>

          {/* Cloud Database Sync Card */}
          <div className="bg-blue-50/70 border-2 border-blue-100 rounded-3xl p-4.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="p-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold">
                  <Database className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs font-black text-blue-950 uppercase tracking-wide">Cloud Firestore</h3>
                  <p className="text-[10px] text-blue-800 font-bold">Durable Real Persistence</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Link</span>
              </span>
            </div>
            
            <p className="text-[11px] text-blue-950 font-semibold leading-normal font-sans">
              Live user steps, schedule rankings, and parent profiles are automatically saved under your Firestore collection walkthrough_leads.
            </p>

            <button
              onClick={() => onForceSync("Manual Sandbox Snapshot Push")}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>Force Snapshot Push</span>
            </button>
          </div>

          {/* Quick Testing & Cloud Console Links */}
          <div className="bg-[#BA3A87]/5 border-2 border-[#BA3A87]/20 rounded-3xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-lg bg-[#BA3A87] text-white text-[10px] font-bold">🔗</span>
              <div>
                <h3 className="text-xs font-black text-ttp-blue uppercase tracking-wide">Live Testing & Firebase</h3>
                <p className="text-[10px] text-ttp-brown/70 font-semibold">Native testing and real-time ledger links</p>
              </div>
            </div>
            
            <p className="text-[11px] text-ttp-brown font-semibold leading-normal font-sans">
              Test your user flow in native mode without external wrappers, or inspect your real sandbox firebase databases directly.
            </p>

            <div className="flex flex-col gap-2 mt-1 font-sans">
              <a
                href="?view=app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white hover:bg-[#BA3A87]/5 text-ttp-blue text-xs font-bold py-2 px-3 border border-ttp-beige rounded-xl shadow-3xs transition-all flex items-center justify-between cursor-pointer"
              >
                <span>📱 Pure Native App Preview</span>
                <span className="text-[10px] font-mono text-[#BA3A87] font-extrabold bg-[#BA3A87]/10 px-1.5 py-0.5 rounded-md">?view=app</span>
              </a>

              <a
                href="https://console.firebase.google.com/u/0/project/gen-lang-client-0773168335/firestore/databases/ai-studio-0e8c7341-5f32-4583-8037-45efa209824d/data"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Open Firebase Console</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB PANEL 2: Persistent Cloud Database Explorer */}
      {activeTabPanel === "database" && (
        <div className="flex flex-col gap-4 animate-fade-in">
          
          {/* Firestore connection badge */}
          <div className="bg-blue-50/80 border border-blue-100 px-3.5 py-3 rounded-2xl flex flex-col gap-1 shadow-3xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-bold text-blue-950">
                <Database className="w-4 h-4 text-blue-600 animate-pulse" />
                <span>Cloud Firestore Database</span>
              </span>
              <span className="bg-teal-100 text-teal-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                CONNECTED
              </span>
            </div>
            <p className="text-[10px] text-blue-800 font-semibold font-mono truncate">
              ID: gen-lang-client-0773168335
            </p>
          </div>

          {/* Persistence Auth Credentials Panel */}
          <div className="bg-stone-50 border border-ttp-grey rounded-2xl p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-ttp-coral" />
              <h3 className="text-xs font-black text-ttp-blue uppercase tracking-wider font-display">
                Persistence Security System
              </h3>
            </div>

            {currentFirebaseUser ? (
              <div className="flex flex-col gap-2.5">
                <div className="bg-white border border-ttp-grey p-2.5 rounded-xl text-xs font-semibold flex flex-col gap-1 shadow-3xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ttp-brown">Status:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <UserCheck className="w-3.5 h-3.5" /> Authenticated
                    </span>
                  </div>
                  <div className="border-t border-stone-100 mt-1.5 pt-1.5 flex flex-col gap-0.5 text-[10px] text-ttp-brown/80 font-mono">
                    <p className="truncate">Email: {currentFirebaseUser.email}</p>
                    <p className="truncate">UID: {currentFirebaseUser.uid}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleSignOutFirebase}
                  disabled={authLoading}
                  className="w-full text-center bg-red-50 hover:bg-red-100 text-red-700 text-[10px] uppercase font-black py-2 rounded-xl transition-all cursor-pointer border border-red-200"
                >
                  {authLoading ? "Logging Out..." : "Logout and lock session"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-2.5">
                <p className="text-[10px] text-ttp-brown/80 leading-normal font-semibold">
                  To secure your scheduling logs in your own secure sandbox partition, login or create a credentials lock.
                </p>

                {authError && (
                  <div className="bg-red-50 text-red-700 text-[10px] font-bold p-2.5 rounded-lg border border-red-200">
                    {authError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute top-2.5 left-2.5 text-ttp-brown/60" />
                    <input
                      type="email"
                      required
                      placeholder="Enter email address"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-white text-xs font-semibold pl-8 pr-2.5 py-2 border border-ttp-grey rounded-lg focus:outline-none focus:border-ttp-coral"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute top-2.5 left-2.5 text-ttp-brown/60" />
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full bg-white text-xs font-semibold pl-8 pr-2.5 py-2 border border-ttp-grey rounded-lg focus:outline-none focus:border-ttp-coral"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 items-center mt-1">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="flex-1 bg-ttp-blue hover:bg-ttp-blue/90 text-white text-[11px] font-black uppercase py-2.5 rounded-xl cursor-pointer shadow-3xs"
                  >
                    {authLoading ? "Hold on..." : isRegisterMode ? "Create profile" : "Secure Sign-in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRegisterMode(!isRegisterMode)}
                    className="text-[10px] font-bold text-ttp-coral hover:underline"
                  >
                    {isRegisterMode ? "Need sign-in?" : "Need to register?"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* FIRESTORE RECORDS LOG TABLES */}
          <div className="bg-white border border-ttp-grey rounded-2xl flex flex-col overflow-hidden max-h-[350px] shadow-3xs">
            
            {/* Header filters */}
            <div className="bg-stone-50 border-b border-ttp-grey px-3.5 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-black text-ttp-blue flex items-center gap-1 font-display">
                  <Filter className="w-3.5 h-3.5 text-ttp-pink" />
                  <span>Interactive Leads Grid</span>
                </span>
                
                {firestoreLeads.length > 0 && (
                  <button
                    onClick={handleClearAllLeads}
                    className="text-[9px] font-black text-red-650 hover:text-red-800 hover:underline"
                  >
                    Wipe Database Logs
                  </button>
                )}
              </div>

              {/* Filtering tabs */}
              <div className="flex items-center gap-1 select-none overflow-x-auto pb-0.5">
                {["all", "onboarding", "proposal", "sms", "lock"].map((act) => (
                  <button
                    key={act}
                    onClick={() => setFilterAction(act)}
                    className={`text-[9px] font-black px-2 py-0.5 rounded-md border capitalize shrink-0 transition-all ${
                      filterAction === act
                        ? "bg-ttp-pink border-ttp-pink text-white"
                        : "bg-white text-ttp-brown border-ttp-grey hover:bg-stone-50"
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>

              {/* Search search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute top-2 left-2 text-ttp-brown/50" />
                <input
                  type="text"
                  placeholder="Query names or steps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white text-[10px] font-semibold pl-7 pr-2 py-1 border border-ttp-grey rounded-lg focus:outline-none focus:border-ttp-coral"
                />
              </div>
            </div>

            {/* List Body of Leads */}
            <div className="overflow-y-auto phone-scroll text-xs" style={{ minHeight: "150px" }}>
              {filteredLeads.length === 0 ? (
                <div className="p-6 text-center text-ttp-brown/60 italic font-medium">
                  {firestoreLeads.length === 0 
                    ? "Firestore database ledger is empty. Complete a step in the wizard to record input data!"
                    : "No logged leads match this current query filter."}
                </div>
              ) : (
                <div className="flex flex-col border-stone-100">
                  {filteredLeads.map((lead, idx) => (
                    <div 
                      key={lead.id || idx} 
                      className="border-b border-stone-100 p-3 flex flex-col gap-1.5 last:border-0 hover:bg-stone-50/40 relative"
                    >
                      <div className="flex justify-between items-start gap-2 pr-12">
                        <div>
                          <h4 className="font-extrabold text-[#32271E] leading-dense text-[11px]">
                            {lead.actionTriggered || "Sandbox Event log"}
                          </h4>
                          <p className="text-[10px] font-mono text-ttp-brown/70 leading-normal mt-0.5 font-semibold">
                            {lead.currentPath || "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Parent demographic details row */}
                      <div className="flex flex-wrap gap-2 text-[9px] font-extrabold font-display">
                        <span className="bg-coral-50/80 border border-ttp-coral/20 px-1.5 py-0.5 rounded text-ttp-coral">
                          👤 {lead.audraName} ({lead.audraChild})
                        </span>
                        <span className="bg-blue-50/80 border border-ttp-blue/20 px-1.5 py-0.5 rounded text-ttp-blue">
                          👤 {lead.whitneyName} ({lead.whitneyChild})
                        </span>
                        {lead.mutualPlaydateTimeLocked === "YES" && (
                          <span className="bg-green-100 text-green-950 px-1.5 py-0.5 rounded">
                            🏆 MATCH LOCKED
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-ttp-brown/65 mt-1 border-t border-dashed border-stone-100 pt-1.5 font-semibold font-mono">
                        <span>
                          {lead.clientTime ? new Date(lead.clientTime).toLocaleTimeString([], { hour: "numeric", minute: "numeric", second: "numeric" }) : "N/A"}
                        </span>
                        
                        {/* Interactive operations */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded px-2 py-0.5 text-[9px] font-bold text-ttp-blue cursor-pointer flex items-center gap-0.5 font-sans"
                            title="Inspect complete Firestore document details"
                          >
                            <Eye className="w-3 h-3 text-ttp-blue" /> Inspect
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(lead.id)}
                            className="bg-red-50 hover:bg-red-100 border border-red-200 rounded p-0.5 text-red-700 cursor-pointer text-[10px]"
                            title="Delete permanently from Firestore"
                          >
                            <Trash className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standalone Spin-off Apps Link Card */}
      <div className="bg-stone-50 border-2 border-ttp-beige rounded-3xl p-4.5 flex flex-col gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="p-1 rounded-lg bg-[#BA3A87] text-white text-[10px] font-bold">
            <Wrench className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-black text-ttp-brown uppercase tracking-wide">Generate Spin-Off views</h3>
            <p className="text-[10px] text-ttp-brown/85 font-semibold">Separate pages for {hostName} & Whitney</p>
          </div>
        </div>

        <p className="text-[11px] text-[#542B1A]/85 leading-relaxed">
          Esther, you can send these individual preview links directly to real people to test. Each link loads a gorgeous, standalone phone emulator with zero lab borders!
        </p>

        {/* COMBINED SEQUENCE CARD */}
        <div className="bg-gradient-to-r from-[#BA3A87]/10 to-[#3D85C6]/10 p-3 rounded-2xl border-2 border-[#BA3A87]/20 flex flex-col gap-1.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] bg-gradient-to-r from-[#BA3A87] to-[#3D85C6] text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider block w-max mt-0.5">
                Universal Demo (Combined View)
              </span>
              <span className="text-[9px] text-[#BA3A87] font-black uppercase">⭐️ Recommended</span>
            </div>
            <p className="text-[10px] text-[#542B1A] font-semibold mt-1 leading-normal">
              One link, starts with {hostName}'s setup, then automatically transforms into Whitney's invite view to test both sides sequentially.
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <a
              href={getStandaloneUrl("combined")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center bg-gradient-to-r from-[#BA3A87] to-[#3D85C6] hover:opacity-95 text-white text-[10px] font-black uppercase py-2.5 rounded-xl transition cursor-pointer"
            >
              Launch Combined Demo ↗
            </a>
            <button
              onClick={() => copyLink("combined")}
              className="bg-white hover:bg-stone-100 text-ttp-brown text-[10px] font-black uppercase py-2.5 px-3 rounded-xl border border-stone-200 transition cursor-pointer min-w-[95px]"
            >
              {copiedCombined ? "✓ Copied!" : "📋 Copy Link"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {/* AUDRA APP */}
          <div className="bg-white border border-ttp-beige/60 p-2.5 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] bg-[#BA3A87]/10 text-[#BA3A87] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1">
                {hostName} (Host Only)
              </span>
              <p className="text-[10px] text-[#542B1A]/80 font-semibold mb-2 leading-relaxed">
                Starts with onboarding, preferences, and generates active proposals.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <a
                href={getStandaloneUrl("audra")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-[#BA3A87] hover:bg-[#BA3A87]/90 text-white text-[10px] font-black uppercase py-2 px-2.5 rounded-xl transition cursor-pointer"
              >
                Launch App ↗
              </a>
              <button
                onClick={() => copyLink("audra")}
                className="w-full text-center bg-stone-100 hover:bg-stone-200 text-ttp-brown text-[9px] font-bold py-1 px-1.5 rounded-lg border border-stone-200 transition cursor-pointer"
              >
                {copiedAudra ? "✓ Copied!" : "📋 Copy Send Link"}
              </button>
            </div>
          </div>

          {/* WHITNEY APP */}
          <div className="bg-white border border-ttp-beige/60 p-2.5 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] bg-[#3D85C6]/10 text-[#3D85C6] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider block w-max mb-1">
                Whitney (Guest Only)
              </span>
              <p className="text-[10px] text-[#542B1A]/80 font-semibold mb-2 leading-relaxed">
                Starts directly with invite SMS notification and time ranking screens.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <a
                href={getStandaloneUrl("whitney")}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-[#3D85C6] hover:bg-[#3D85C6]/90 text-white text-[10px] font-black uppercase py-2 px-2.5 rounded-xl transition cursor-pointer"
              >
                Launch App ↗
              </a>
              <button
                onClick={() => copyLink("whitney")}
                className="w-full text-center bg-stone-100 hover:bg-stone-200 text-ttp-brown text-[9px] font-bold py-1 px-1.5 rounded-lg border border-stone-200 transition cursor-pointer"
              >
                {copiedWhitney ? "✓ Copied!" : "📋 Copy Send Link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TTP SYSTEM AUDIT LOGS */}
      <div className="flex-1 min-h-[170px] flex flex-col bg-[#32271E] border-2 border-[#32271E] rounded-3xl p-4 overflow-hidden shadow-inner shrink-0">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between shrink-0 mb-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-ttp-yellow animate-pulse" />
            <span className="text-xs font-bold text-[#CCC5B5] font-mono uppercase tracking-wider">Engine Logger</span>
          </div>
          <button
            onClick={clearLogs}
            className="text-[9px] font-bold text-[#E6E2DA]/80 hover:text-white bg-[#32271E]/60 border border-[#CCC5B5]/20 px-2 py-0.5 rounded-md transition"
          >
            Clear
          </button>
        </div>

        {/* Engine scrolling contents */}
        <div className="flex-1 overflow-y-auto phone-scroll flex flex-col gap-2 p-1.5 bg-[#32271E]/90 rounded-xl" style={{ maxHeight: "175px" }}>
          {auditLogs.length === 0 ? (
            <p className="text-[10px] text-ttp-beige/60 italic p-2 font-mono">Logger: Idle. Awaiting playdate wizard actions...</p>
          ) : (
            auditLogs.map((log, index) => (
              <div key={index} className="flex flex-col border-b border-white/5 pb-2 last:border-0 border-solid">
                <div className="flex items-center justify-between">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black font-mono border border-solid ${getLogCategoryColor(log.category)}`}>
                    {log.category}: {log.event}
                  </span>
                  <span className="text-[8px] text-[#CCC5B5]/50 font-mono">{log.timestamp}</span>
                </div>
                <p className="text-[10px] text-[#E6E2DA] font-mono mt-1 leading-normal pl-0.5">
                  {log.description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Master Reset simulation Button */}
      <button
        onClick={resetSimulation}
        className="w-full border-2 border-dashed border-ttp-beige hover:border-ttp-coral font-black text-xs py-3.5 text-ttp-brown hover:text-ttp-coral bg-stone-50 hover:bg-ttp-coral/5 rounded-2xl transition flex items-center justify-center gap-1.5 shrink-0"
      >
        <ListRestart className="w-4 h-4" />
        <span>Reset Simulator Profile Deck</span>
      </button>

      {/* REAL-TIME MODAL: JSON FIREBASE FIELD INSPECTOR */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#32271E] text-stone-150 rounded-3xl w-full max-w-lg p-5 border-2 border-[#542B1A] flex flex-col max-h-[85vh] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-ttp-yellow font-display uppercase tracking-wider">
                <Database className="w-4 h-4 text-stp-emerald" />
                <span>Firestore Document Viewer</span>
              </span>
              <button 
                onClick={() => setSelectedLead(null)}
                className="text-stone-300 hover:text-white p-1 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspect info text */}
            <div className="mb-3.5 bg-stone-900/40 p-2.5 rounded-xl border border-white/5">
              <p className="text-[11px] font-bold text-[#E6E2DA] leading-tight font-sans">
                Collection: <span className="text-ttp-pink">walkthrough_leads</span> • Document ID: <span className="text-ttp-yellow font-mono">{selectedLead.id}</span>
              </p>
            </div>

            {/* Pretty JSON area */}
            <div className="flex-1 overflow-y-auto px-1">
              <pre className="text-[10px] font-mono text-ttp-beige leading-relaxed p-3.5 bg-black/50 border border-white/5 rounded-2xl overflow-x-auto phone-scroll text-left">
                {JSON.stringify(selectedLead, null, 2)}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  handleDeleteDoc(selectedLead.id);
                  setSelectedLead(null);
                }}
                className="bg-red-900/80 hover:bg-red-800 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl shadow-xs transition"
              >
                Delete Doc Permanently
              </button>
              <button
                onClick={() => setSelectedLead(null)}
                className="bg-white/15 hover:bg-white/20 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded-xl border border-white/10 shadow-xs transition"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        