/**
 * Presentation helpers for the communications timeline (ADR-0011). Maps an
 * interaction `source` and `direction` to a label, a lucide icon name, and a tone
 * class. Pure data — safe to import from server or client components.
 */

export interface ChannelMeta {
  label: string;
  icon: string; // lucide-react icon name (resolved by <Icon/>)
}

/** Source (system of origin) → display. Falls back to a generic label. */
const SOURCE_META: Record<string, ChannelMeta> = {
  m365_email: { label: "Email (M365)", icon: "Mail" },
  email: { label: "Email", icon: "Mail" },
  m365_teams: { label: "Teams", icon: "MessagesSquare" },
  sms: { label: "SMS", icon: "MessageCircle" },
  whatsapp: { label: "WhatsApp", icon: "MessageCircle" },
  phone_call: { label: "Call", icon: "Phone" },
  plaud: { label: "In-person (Plaud)", icon: "Mic" },
  in_person: { label: "In person", icon: "Users" },
  meeting: { label: "Meeting", icon: "Video" },
  facebook: { label: "Facebook", icon: "Facebook" },
  youtube: { label: "YouTube", icon: "Youtube" },
  linkedin: { label: "LinkedIn", icon: "Linkedin" },
  web_form: { label: "Web form", icon: "Globe" },
  system: { label: "System", icon: "Settings" },
};

export function sourceMeta(source: string): ChannelMeta {
  return SOURCE_META[source] ?? { label: source, icon: "Circle" };
}

/** The filter chips on the Communications page (subset of common channels). */
export const CHANNEL_FILTERS: { key: string; label: string; icon: string }[] = [
  { key: "m365_email", label: "Email", icon: "Mail" },
  { key: "m365_teams", label: "Teams", icon: "MessagesSquare" },
  { key: "sms", label: "SMS", icon: "MessageCircle" },
  { key: "plaud", label: "Calls / In-person", icon: "Mic" },
  { key: "linkedin", label: "LinkedIn", icon: "Linkedin" },
  { key: "youtube", label: "YouTube", icon: "Youtube" },
  { key: "facebook", label: "Facebook", icon: "Facebook" },
];

/** Direction → label + tone class for the badge. */
export function directionMeta(direction: string | null): { label: string; tone: string } {
  switch (direction) {
    case "inbound":
      return { label: "Inbound", tone: "text-green" };
    case "outbound":
      return { label: "Outbound", tone: "text-accent" };
    case "internal":
      return { label: "Internal", tone: "text-dim" };
    default:
      return { label: "—", tone: "text-dim" };
  }
}

/** Lawful-basis chip tone (ADR-0025). */
export function lawfulBasisTone(basis: string): string {
  switch (basis) {
    case "consent":
      return "text-green";
    case "contract":
      return "text-accent";
    case "public_data":
      return "text-dim";
    case "legitimate_interest":
    default:
      return "text-amber";
  }
}
