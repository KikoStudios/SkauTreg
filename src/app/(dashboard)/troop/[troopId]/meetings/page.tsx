import { redirect } from "next/navigation";

export default async function LegacyMeetingsPage({ params }: { params: Promise<{ troopId: string }> }) {
  const { troopId } = await params;
  redirect(`/troop/${troopId}/documents`);
}
