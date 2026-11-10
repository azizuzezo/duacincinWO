"use client";

import { use } from "react";

import { RsvpView } from "@/components/public/rsvp/RsvpView";

// Guest-facing RSVP. Deliberately without the marketplace navbar/footer: a
// guest came to answer an invitation, not to shop for vendors.
export default function RSVPPage({ params }: PageProps<"/rsvp/[token]">) {
  const { token } = use(params);
  return <RsvpView token={token} />;
}
