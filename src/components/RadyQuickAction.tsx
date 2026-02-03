import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import React from "react";

export default function RadyQuickAction() {
  const router = useRouter();
  const params = useParams();
  const troopId = params.troopId;
  return {
    title: "Rady",
    description: "Správa rad a zápisů.",
    icon: <img src="/illustrations/meeting-illustration.svg" alt="Rady" style={{ height: "80px", width: "auto", display: "block" }} />,
    status: "active",
    action: () => router.push(`/rady?troopId=${troopId}`)
  };
}
