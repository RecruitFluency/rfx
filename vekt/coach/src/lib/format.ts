import type { Match, Program, Role, Verdict } from "./types";

export const roleLabel: Record<Role, string> = {
  head_coach: "Head coach", assistant_coach: "Assistant coach", dept_admin: "Department admin", compliance: "Compliance", vekt_admin: "VEKT admin",
};
export const programName = (p?: Program | null) =>
  p ? `${p.team_gender === "men" ? "Men's" : p.team_gender === "women" ? "Women's" : ""} ${p.sport.charAt(0).toUpperCase()}${p.sport.slice(1)}`.trim() : "";

export const matchLabel: Record<Match, string> = { strong: "Strong", match: "Match", look_closer: "Look closer", gap: "Gap", not_covered: "Not covered" };
export const verdictLabel: Record<Verdict, string> = { same_story: "Same story", look_closer: "Look closer", contradiction: "Different story", not_covered: "Not covered" };

export const firstName = (n?: string | null) => (n || "").split(/\s+/)[0] || "";
export const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "");
export const dateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
export const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const eventLabel: Record<string, string> = {
  dry_run: "Test mode (not sent)", sent: "Sent", delivered: "Delivered", opened: "Opened", clicked: "Clicked", replied: "Replied",
  failed: "Failed", error: "Error", bounced: "Bounced", blocked: "Blocked (opted out)", opted_out: "Opted out", opted_in: "Opted back in",
  held: "Held for contact date", scheduled: "Scheduled", retrying: "Retrying",
};
export const roleTo: Record<string, string> = { athlete: "Athlete", parent: "Parent", club_coach: "Club director", coach: "Your staff" };
