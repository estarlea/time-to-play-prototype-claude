/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PlaydatePreferences, OtherParent, ProposalState, SimulatedStep, SystemAuditLog } from "./types";
import { DEFAULT_AUDRA_PREFERENCES, DEFAULT_WHITNEY_PARENT } from "./data";
import AudraApp from "./components/AudraApp";
import AuthScreen from "./components/AuthScreen";
import posthog from "posthog-js";

export default function App() {
  const [preferences, setPreferences] = useState<PlaydatePreferences>(DEFAULT_AUDRA_PREFERENCES);
  const [whitneyParent, setWhitneyParent] = useState<OtherParent>(DEFAULT_WHITNEY_PARENT);
  const [currentStep, setCurrentStep] = useState<SimulatedStep>("audra_onboarding");
  const [activeProposal, setActiveProposal] = useState<ProposalState | null>(null);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [clickedButtons, setClickedButtons] = useState<Record<string, boolean>>({});
  const [showAuthGate, setShowAuthGate] = useState(false);

  const preferencesRef = React.useRef(preferences);
  const currentStepRef = React.useRef(currentStep);
  const activeProposalRef = React.useRef(activeProposal);
  const clickedButtonsRef = React.useRef<Record<string, boolean>>({});

  React.useEffect(() => { preferencesRef.current = preferences; }, [preferences]);
  React.useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  React.useEffect(() => { activeProposalRef.current = activeProposal; }, [activeProposal]);
  React.useEffect(() => { clickedButtonsRef.current = clickedButtons; }, [clickedButtons]);

  const trackClick = (buttonId: string) => {
    setClickedButtons(prev => ({ ...prev, [buttonId]: true }));
  };

  const addAuditLog = (event: string, category: "AI" | "CALENDAR" | "SMS" | "SYSTEM", description: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAuditLogs(prev => [{ timestamp: timeStr, event, category, description }, ...prev]);
  };

  const handleReset = () => {
    setPreferences({ ...DEFAULT_AUDRA_PREFERENCES });
    setWhitneyParent({ ...DEFAULT_WHITNEY_PARENT });
    setCurrentStep("audra_onboarding");
    setActiveProposal(null);
    setAuditLogs([]);
    setClickedButtons({});
    setShowAuthGate(false);
  };

  useEffect(() => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAuditLogs([{
      timestamp: timeStr,
      event: "Time to Play Active",
      category: "SYSTEM",
      description: "App initialized. Ready to plan your next playdate!"
    }]);
  }, []);

  // Called after successful Firebase Auth — open native share sheet
  const handleAuthSuccess = async () => {
    setShowAuthGate(false);
    posthog.capture("account_created_and_shared");

    const proposal = activeProposalRef.current;
    const prefs = preferencesRef.current;
    const childName = prefs.childName || "my child";
    const day = proposal?.dayText || "";
    const date = proposal?.dateText || "";
    const time = proposal?.timeText || "";

    const shareText = `Hey! I just used Time to Play to find us the perfect playdate time. How about ${day}, ${date} at ${time}? Let me know if that works! 🎉`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Playdate for ${childName}!`,
          text: shareText,
        });
        posthog.capture("share_sheet_opened");
        addAuditLog("Invite Shared", "SMS", `Native share sheet opened for ${childName}'s playdate on ${day}, ${date} at ${time}.`);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      addAuditLog("Invite Copied", "SMS", "Share text copied to clipboard (share API not available).");
      alert("Message copied to clipboard! Paste it into a text to your friend.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-start antialiased font-sans">
      <div className="w-full max-w-md min-h-screen flex flex-col bg-white md:shadow-2xl md:border-x border-stone-150/40 relative">
        {showAuthGate ? (
          <AuthScreen
            preferences={preferences}
            activeProposal={activeProposal}
            onSuccess={handleAuthSuccess}
            onClose={() => setShowAuthGate(false)}
          />
        ) : (
          <AudraApp
            preferences={preferences}
            setPreferences={setPreferences}
            whitneyParent={whitneyParent}
            setWhitneyParent={setWhitneyParent}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
            activeProposal={activeProposal}
            setActiveProposal={setActiveProposal}
            addAuditLog={addAuditLog}
            triggerSmsFlow={() => {}}
            resetSimulation={handleReset}
            trackClick={trackClick}
            onTriggerEarlyAccess={() => setShowAuthGate(true)}
          />
        )}
      </div>
    </div>
  );
}
