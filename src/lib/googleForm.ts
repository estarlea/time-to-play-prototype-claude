/**
 * Google Form submission helper
 * Replaces Firebase Firestore for lead capture.
 * Responses appear in the linked Google Sheet automatically.
 */

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScYOYbWjdrHpl0trmIkaAVCxx8Ume1YV5QKtiM5-KUS55j31A/formResponse";

const FORM_FIELDS = {
  firstName: "entry.81506387",
  lastName:  "entry.1511943139",
  email:     "entry.117357637",
  phone:     "entry.1530050389",
};

/**
 * Submit early-access lead to Google Form.
 * Uses no-cors so we can't read the response — but Google Forms receives it.
 */
export async function submitToGoogleForm(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): Promise<void> {
  const body = new URLSearchParams({
    [FORM_FIELDS.firstName]: data.firstName,
    [FORM_FIELDS.lastName]:  data.lastName,
    [FORM_FIELDS.email]:     data.email,
    [FORM_FIELDS.phone]:     data.phone,
  });

  await fetch(FORM_URL, {
    method: "POST",
    mode:   "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:   body.toString(),
  });
}

/**
 * Lightweight field-level tracking (logs to console).
 * Drop-in replacement for the Firebase Analytics version.
 */
export function logFieldSubmission(fieldName: string, value: string): void {
  if (value && value.trim()) {
    console.log(`[TTP Field] ${fieldName}: ${value}`);
  }
}
