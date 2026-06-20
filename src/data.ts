import { TimeSlotOption, PlaydatePreferences, OtherParent, ProposalState, TimeSlotId } from "./types";

export const PRESET_LOTS: TimeSlotOption[] = [
  { id: "sat_morning", label: "Saturday morning", defaultTime: "10:00 AM", category: "weekend" },
  { id: "sat_afternoon", label: "Saturday afternoon", defaultTime: "2:00 PM", category: "weekend" },
  { id: "sun_afternoon", label: "Sunday afternoon", defaultTime: "2:00 PM", category: "weekend" },
  { id: "sun_morning", label: "Sunday morning", defaultTime: "10:00 AM", category: "weekend" },
  { id: "mon_afterschool", label: "Monday after school", defaultTime: "3:30 PM", category: "afterschool" },
  { id: "tue_afterschool", label: "Tuesday after school", defaultTime: "3:30 PM", category: "afterschool" },
  { id: "wed_afterschool", label: "Wednesday after school", defaultTime: "3:30 PM", category: "afterschool" },
  { id: "thu_afterschool", label: "Thursday after school", defaultTime: "3:30 PM", category: "afterschool" },
  { id: "fri_afterschool", label: "Friday after school", defaultTime: "3:30 PM", category: "afterschool" }
];

export const MOCK_CALENDAR_EVENTS = [];

export const DEFAULT_AUDRA_PREFERENCES: PlaydatePreferences = {
  rankedSlots: [],
  afterSchoolTime: "4:00 PM",
  calendarBlockerActive: false,
  calendarEmail: "",
  calendarShared: true,
  childName: "",
  cadencePerMonth: 4,
  parentName: "",
  parentPhone: "",
  favoriteLocations: ["", "", ""]
};

export const MOCK_WHITNEY_PREFS = {
  rankedSlots: ["sat_afternoon", "sun_afternoon", "sat_morning", "thu_afterschool"] as TimeSlotId[],
  afterSchoolTime: "3:00 PM" as const
};

export const DEFAULT_WHITNEY_PARENT: OtherParent = {
  name: "",
  childName: "",
  phone: "",
  isReturningUser: false,
  preferences: MOCK_WHITNEY_PREFS
};

// Maps slot prefix to JS day-of-week index (0=Sun, 1=Mon, ... 6=Sat)
const SLOT_DAY_OF_WEEK: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const DAY_NAMES: Record<string, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

/**
 * Returns the next upcoming date for a given slot prefix (e.g. "sat", "mon").
 * Always at least 1 day ahead so we never return today.
 */
function getNextDateForSlot(slotPrefix: string): Date {
  const targetDow = SLOT_DAY_OF_WEEK[slotPrefix];
  if (targetDow === undefined) return new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysUntil = (targetDow - today.getDay() + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // never return today, always next week's instance
  const result = new Date(today);
  result.setDate(today.getDate() + daysUntil);
  return result;
}

export function getTimeSlotLabel(slotId: TimeSlotId, customAfterSchoolTime?: string): string {
  const item = PRESET_LOTS.find((p) => p.id === slotId);
  if (!item) return "";
  if (item.category === "afterschool" && customAfterSchoolTime) {
    return `${item.label} @ ${customAfterSchoolTime}`;
  }
  return `${item.label} @ ${item.defaultTime}`;
}

export function formatSlotDateTime(slotId: TimeSlotId, afterSchoolTimeSetting: string): { day: string; time: string } {
  const item = PRESET_LOTS.find((p) => p.id === slotId);
  const time = item?.category === "afterschool" ? afterSchoolTimeSetting : (item?.defaultTime || "10:00 AM");

  const prefix = slotId.split("_")[0];
  const dayName = DAY_NAMES[prefix] || "Saturday";
  const nextDate = getNextDateForSlot(prefix);
  const dateLabel = nextDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const day = `${dayName} (${dateLabel})`;

  return { day, time };
}

function parseTimeString(timeStr: string): { hour: number; minute: number } {
  const clean = timeStr.trim().toUpperCase();
  const isPm = clean.includes("PM");
  const isAm = clean.includes("AM");
  const numbersOnly = clean.replace(/[AP]M/, "").trim();
  const parts = numbersOnly.split(":");
  let hour = parseInt(parts[0], 10);
  let minute = parts[1] ? parseInt(parts[1], 10) : 0;
  
  if (isPm && hour < 12) {
    hour += 12;
  }
  if (isAm && hour === 12) {
    hour = 0;
  }
  return { hour, minute };
}

export function getSlotDateTime(slotId: TimeSlotId, afterSchoolTimeSetting: string): Date {
  const item = PRESET_LOTS.find((p) => p.id === slotId);
  const time = item?.category === "afterschool" ? afterSchoolTimeSetting : (item?.defaultTime || "10:00 AM");
  const prefix = slotId.split("_")[0];
  const { hour, minute } = parseTimeString(time);
  const date = getNextDateForSlot(prefix);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * AI Proposal Engine
 * Resolves properties dynamically based on state models
 */
export function calculateBestProposal(
  audraPrefs: PlaydatePreferences,
  whitney: OtherParent
): { proposal: ProposalState; log: string[] } {
  const logs: string[] = [];
  logs.push(`🔍 Initiated TTP AI Proposal Engine...`);
  logs.push(`Child: ${audraPrefs.childName} | Target cadence: ${audraPrefs.cadencePerMonth} playdates/month`);

  // Audra's source order
  let listToSearch = [...audraPrefs.rankedSlots];
  logs.push(`Audra's preferred slots: ${listToSearch.map(s => s.split('_').join(' ')).join(', ')}`);

  // 1. If calendar blocker is active, filter out overlapping slots
  if (audraPrefs.calendarBlockerActive) {
    if (!audraPrefs.calendarEmail || !audraPrefs.calendarEmail.trim()) {
      logs.push("📅 Calendar Blocker is ACTIVE, but no email address is provided. Skipping blocker scan.");
    } else {
      logs.push(`📅 Calendar Blocker is ACTIVE. Cross-referencing shared calendar for '${audraPrefs.calendarEmail}'...`);
      MOCK_CALENDAR_EVENTS
        .filter((e: any) => e.affectsSlot !== null)
        .forEach((e: any) => {
          const slot = e.affectsSlot as TimeSlotId;
          logs.push(`⚠️ Filtered out slot '${slot.split('_').join(' ')}' due to overlapping event in calendar '${audraPrefs.calendarEmail}': "${e.title}".`);
        });

      const blockedSlots = MOCK_CALENDAR_EVENTS
        .filter((e: any) => e.affectsSlot !== null)
        .map((e: any) => e.affectsSlot as TimeSlotId);
      
      listToSearch = listToSearch.filter(s => !blockedSlots.includes(s));
    }
  } else {
    logs.push("📅 Calendar Blocker is INACTIVE.");
  }

  // 1.5. Filter out slots that are less than 36 hours from the current time to prevent last minute proposals
  const now = new Date();
  const minTimeNeeded = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  logs.push(`⏰ Scanning slots for 36-hour lead time requirement (Current simulation: ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})...`);

  // Log which slots are filtered out
  const lastMinuteSlots: TimeSlotId[] = [];
  const filteredFromLastMinute = listToSearch.filter(s => {
    const slotTime = getSlotDateTime(s, audraPrefs.afterSchoolTime);
    const isValid = slotTime >= minTimeNeeded;
    if (!isValid) {
      lastMinuteSlots.push(s);
    }
    return isValid;
  });

  if (lastMinuteSlots.length > 0) {
    lastMinuteSlots.forEach(slot => {
      logs.push(`⚠️ Filtered out last-minute slot '${slot.split('_').join(' ')}' (occurs within 36 hours of current time).`);
    });
    listToSearch = filteredFromLastMinute;
  } else {
    logs.push(`✅ All checked preferences satisfy the 36-hour notice constraint.`);
  }

  let finalSlot: TimeSlotId | null = null;
  const fallbackSlot = PRESET_LOTS.find(p => getSlotDateTime(p.id, audraPrefs.afterSchoolTime) >= minTimeNeeded)?.id || "sat_afternoon";

  // 2. Returning User matching
  if (whitney.isReturningUser && whitney.preferences) {
    logs.push(`✨ Whitney is a returning user! Extracting her saved top slots: ${whitney.preferences.rankedSlots.map(s => s.split('_').join(' ')).join(', ')}`);
    
    // Find first slot in Audra's filtered list that Whitney also prefers
    const mutualSlot = listToSearch.find(s => whitney.preferences?.rankedSlots.includes(s));
    
    if (mutualSlot) {
      logs.push(`🏆 Found a mutual slot! both prefer: '${mutualSlot.split('_').join(' ')}'`);
      finalSlot = mutualSlot;
    } else {
      logs.push(`⚠️ No perfect overlap found between ranked limits. Falling back to Audra's prime remaining preference.`);
      finalSlot = listToSearch[0] || fallbackSlot;
    }
  } else {
    logs.push(`ℹ️ Whitney is a NEW user. Matching solely against Audra's highest-ranked available preference.`);
    finalSlot = listToSearch[0] || fallbackSlot;
  }

  logs.push(`🎉 Selected Slot: ${finalSlot.split('_').join(' ')}`);

  // Format Proposal
  const { day, time } = formatSlotDateTime(finalSlot, audraPrefs.afterSchoolTime);
  
  const proposal: ProposalState = {
    id: `p-${Date.now()}`,
    dayText: day.split(" (")[0],
    dateText: day.includes("(") ? day.split(" (")[1].replace(")", "") : "June 20",
    timeText: time,
    locationText: `${audraPrefs.childName || "Emma"}'s place`,
    slotIdUsed: finalSlot
  };

  return { proposal, log: logs };
}

export function calculateMutualOverlapProposal(
  audraPrefs: PlaydatePreferences,
  whitneyRankedSlots: TimeSlotId[],
  whitneyAfterSchoolTime: string,
  whitneyCalendarBlockerActive: boolean,
  whitneyCalendarEmail: string,
  guestSelectedLocation: string
): { proposal: ProposalState; log: string[] } {
  const logs: string[] = [];
  logs.push(`🔍 Initiated Dynamic Multi-Parent Overlap solver...`);
  logs.push(`Host (Audra/${audraPrefs.childName}) vs. Guest (Whitney/Lily)`);

  // 1. Get Audra's valid slots
  let audraValid = [...audraPrefs.rankedSlots];
  if (audraPrefs.calendarBlockerActive) {
    const blockedSlots = MOCK_CALENDAR_EVENTS
      .filter(e => e.affectsSlot !== null)
      .map(e => e.affectsSlot as TimeSlotId);
    audraValid = audraValid.filter(s => !blockedSlots.includes(s));
    logs.push(`📅 Host Calendar Blocker is ACTIVE (scanning '${audraPrefs.calendarEmail}'). Valid Host slots: ${audraValid.map(s => s.split('_').join(' ')).join(', ')}`);
  } else {
    logs.push(`📅 Host Calendar Blocker is INACTIVE. Valid Host slots: ${audraValid.map(s => s.split('_').join(' ')).join(', ')}`);
  }

  // Filter 36 hours for Audra
  const now = new Date();
  const minTimeNeeded = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  audraValid = audraValid.filter(s => getSlotDateTime(s, audraPrefs.afterSchoolTime) >= minTimeNeeded);
  logs.push(`⏰ Filtered Host slots for 36-hr notice limit: ${audraValid.map(s => s.split('_').join(' ')).join(', ')}`);

  // 2. Get Whitney's valid slots
  let guestValid = [...whitneyRankedSlots];
  if (whitneyCalendarBlockerActive) {
    const guestBlocked: TimeSlotId[] = ["fri_afterschool"];
    guestValid = guestValid.filter(s => !guestBlocked.includes(s));
    logs.push(`📅 Guest Calendar Blocker is ACTIVE (scanning '${whitneyCalendarEmail}'). Valid Guest slots: ${guestValid.map(s => s.split('_').join(' ')).join(', ')}`);
  } else {
    logs.push(`📅 Guest Calendar Blocker is INACTIVE. Valid Guest slots: ${guestValid.map(s => s.split('_').join(' ')).join(', ')}`);
  }

  // Filter 36 hours for Guest
  guestValid = guestValid.filter(s => getSlotDateTime(s, whitneyAfterSchoolTime) >= minTimeNeeded);
  logs.push(`⏰ Filtered Guest slots for 36-hr notice limit: ${guestValid.map(s => s.split('_').join(' ')).join(', ')}`);

  // 3. Find Mutual Intersection (overlap)
  const overlappingSlots = audraValid.filter(s => guestValid.includes(s));
  
  let finalSlot: TimeSlotId;
  if (overlappingSlots.length > 0) {
    // Find the slot with the lowest index sum (highest joint preference)
    let bestSlot = overlappingSlots[0];
    let bestScore = Infinity;
    
    overlappingSlots.forEach(slot => {
      const audraIndex = audraPrefs.rankedSlots.indexOf(slot);
      const guestIndex = whitneyRankedSlots.indexOf(slot);
      const score = audraIndex + guestIndex;
      logs.push(`⚖️ Analyzed mutual slot '${slot.split('_').join(' ')}' -> host rank: #${audraIndex+1}, guest rank: #${guestIndex+1} (Combined weight: ${score})`);
      if (score < bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    });
    
    logs.push(`🏆 Selected winning mutual slot: '${bestSlot.split('_').join(' ')}' (Combined rank score: ${bestScore})`);
    finalSlot = bestSlot;
  } else {
    logs.push(`⚠️ No perfect overlap found between custom ranking lists. Selecting Host's highest open priority.`);
    finalSlot = audraValid[0] || "sat_afternoon";
  }

  // Generate proposal
  const useAfterSchoolTime = finalSlot.endsWith("afterschool") ? whitneyAfterSchoolTime : "2:00 PM";
  const { day, time } = formatSlotDateTime(finalSlot, useAfterSchoolTime);
  
  const proposal: ProposalState = {
    id: `p-${Date.now()}`,
    dayText: day.split(" (")[0],
    dateText: day.includes("(") ? day.split(" (")[1].replace(")", "") : "TBD",
    timeText: time,
    locationText: guestSelectedLocation || `${audraPrefs.childName || "Emma"}'s place`,
    slotIdUsed: finalSlot
  };

  return { proposal, log: logs };
}
