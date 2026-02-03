"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import styles from "../../app/(dashboard)/rady/[meetingId]/MeetingRoom.module.css";

interface ParticipantsPanelProps {
    meetingId: Id<"meetings">;
}

export default function ParticipantsPanel({
    meetingId,
}: ParticipantsPanelProps) {
    const participants = useQuery(api.presence.getActiveParticipants, { meetingId });

    if (!participants || participants.length === 0) return null;

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>LIDÉ</h3>
            <div className={styles.participantsList}>
                {participants.map((participant) => (
                    <div
                        key={participant._id}
                        className={styles.participantAvatar}
                        style={{
                            backgroundImage: participant.user?.image ? `url(${participant.user.image})` : 'none'
                        }}
                        title={participant.user?.name || "Anonymous"}
                    >
                        {!participant.user?.image && "👤"}
                    </div>
                ))}
            </div>
        </div>
    );
}
