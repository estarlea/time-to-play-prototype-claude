import React from "react";
import { Smartphone, Wifi, Battery, Radio } from "lucide-react";

interface PhoneMockupProps {
  ownerLabel: string;
  phoneColor: "coral" | "blue" | "green" | "brown";
  children: React.ReactNode;
}

export default function PhoneMockup({ ownerLabel, phoneColor, children }: PhoneMockupProps) {
  // Setup color variations
  const frameColors = {
    coral: "border-ttp-coral/80 bg-ttp-coral/5 ring-ttp-coral/20",
    blue: "border-ttp-blue/80 bg-ttp-blue/5 ring-ttp-blue/20",
    brown: "border-ttp-brown bg-ttp-brown/5 ring-ttp-brown/20",
    green: "border-ttp-green bg-ttp-green/5 ring-ttp-green/20"
  };

  const badgeColors = {
    coral: "bg-ttp-coral text-white border-ttp-coral shadow-sm",
    blue: "bg-ttp-blue text-white border-ttp-blue shadow-sm",
    brown: "bg-ttp-brown text-white border-ttp-brown shadow-sm",
    green: "bg-ttp-green text-white border-ttp-green shadow-sm"
  };

  const timeString = "9:41 AM";

  return (
    <div className="flex flex-col items-center w-full max-w-[390px] mx-auto">
      {/* Phone Label Badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${badgeColors[phoneColor]}`}>
          {ownerLabel}
        </span>
      </div>

      {/* Exterior Chassis Frame */}
      <div className={`relative w-full aspect-[9/19.5] rounded-[52px] border-[11px] ${frameColors[phoneColor]} shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-4 flex flex-col overflow-hidden bg-stone-50 select-none`}>
        
        {/* Dynamic Island Notch */}
        <div className="absolute top-[11px] left-1/2 transform -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3">
          <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-950 opacity-40"></div>
        </div>

        {/* Status Bar */}
        <div className="h-10 pt-3 px-6 flex justify-between items-center text-[11px] font-semibold text-slate-800 z-40">
          <span>{timeString}</span>
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-slate-700" />
            <Wifi className="w-3 h-3 text-slate-700" />
            <Battery className="w-4 h-4 text-slate-700 fill-slate-700" />
          </div>
        </div>

        {/* Screen Content Viewport */}
        <div className="flex-1 flex flex-col relative h-[calc(100%-40px)] overflow-hidden">
          {children}
        </div>

        {/* iOS Home Indicator Bar */}
        <div className="h-[12px] pb-[6px] flex justify-center items-end bg-transparent relative z-40">
          <div className="w-[120px] h-[4px] bg-slate-300 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
