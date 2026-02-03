"use client";

import { useParams } from "next/navigation";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";

import MeetingsTab from "../../../../../components/MeetingsTab";

export default function MeetingsPage() {
  return <MeetingsTab />;
}
