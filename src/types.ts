export type TimeSlotId =
  | "sat_morning"
  | "sat_afternoon"
  | "sun_morning"
  | "sun_afternoon"
  | "fri_afterschool"
  | "wed_afterschool"
  | "thu_afterschool"
  | "tue_afterschool"
  | "mon_afterschool";

export interface TimeSlotOption {
  id: TimeSlotId;
  label: string;
  defaultTime: string;
  category: "weekend" | "afterschool";
}

export interface PlaydatePreferences {
  rankedSlots: TimeSlotId[]; // Top 5 slots ordered
  afterSchoolTime: "3:00 PM" | "4:00 PM" | "5:00 PM";
  calendarBlockerActive: boolean;
  calendarEmail: string;
  calendarShared: boolean;
  childName: string;
  cadencePerMonth: number; // e.g. 4
  parentName: string;
  parentPhone: string;
  favoriteLocations: string[];
}

export interface OtherParent {
  name: string;
  childName: string;
  phone: string;
  email?: string; // Capturing Guest parent email
  isReturningUser: boolean;
  preferences?: {
    rankedSlots: TimeSlotId[];
    afterSchoolTime: "3:00 PM" | "4:00 PM" | "5:00 PM";
  };
}

export interface ProposalState {
  id: string;
  dayText: string; // e.g. "Saturday"
  dateText: string; // e.g. "June 20"
  timeText: string; // e.g. "10:00 AM"
  locationText: string;
  slotIdUsed: TimeSlotId;
}

export type SimulatedStep =
  | "audra_onboarding"
  | "audra_dashboard"
  | "audra_proposal"
  | "whitney_sms_received"
  | "whitney_sms_confirmed"
  | "whitney_web_preferences"
  | "whitney_web_success"
  | "playdate_fully_locked";

export interface SystemAuditLog {
  timestamp: string;
  event: string;
  category: "AI" | "CALENDAR" | "SMS" | "SYSTEM";
  description: string;
}
