"use client";

import { useEffect, useRef } from "react";
import { Trash2, UserPlus, X } from "lucide-react";
import styles from "./TripStaffModal.module.css";

type TeamLeader = { _id: string; name?: string; email?: string; role?: string };
type TripStaff = { _id: string; userId?: string; name: string; role: string; age?: number; benefit?: string; user?: { name?: string } | null };
type LeaderPreset = { _id: string; name: string; role: string };

type Props = {
  open: boolean;
  onClose: () => void;
  leaders: TeamLeader[];
  staff: TripStaff[];
  presets: LeaderPreset[];
  selectedLeaderId: string;
  setSelectedLeaderId: (value: string) => void;
  onAddLeader: () => Promise<void>;
  externalName: string;
  setExternalName: (value: string) => void;
  externalRole: "leader" | "rover";
  setExternalRole: (value: "leader" | "rover") => void;
  externalAge: string;
  setExternalAge: (value: string) => void;
  externalBenefit: string;
  setExternalBenefit: (value: string) => void;
  benefitOptions: string[];
  saveAsPreset: boolean;
  setSaveAsPreset: (value: boolean) => void;
  onAddExternal: () => Promise<void>;
  onAddPreset: (presetId: string) => Promise<void>;
  onRemovePreset: (presetId: string) => Promise<void>;
  onRemoveStaff: (staffId: string) => Promise<void>;
};

export default function TripStaffModal(props: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { open, onClose } = props;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  const assignedIds = new Set(props.staff.map((person) => person.userId).filter(Boolean));
  const availableLeaders = props.leaders.filter((leader) => !assignedIds.has(leader._id));

  return (
    <div className={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="trip-staff-title">
        <header className={styles.header}>
          <div><span>Organizační tým</span><h2 id="trip-staff-title">Vedoucí a roveři</h2></div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Zavřít"><X size={20} /></button>
        </header>

        <div className={styles.body}>
          <section className={styles.card}>
            <h3>Přidat z vedení oddílu</h3>
            <div className={styles.addRow}>
              <select value={props.selectedLeaderId} onChange={(event) => props.setSelectedLeaderId(event.target.value)} aria-label="Vedoucí nebo rover">
                <option value="">Vyberte osobu…</option>
                {availableLeaders.map((leader) => <option key={leader._id} value={leader._id}>{leader.name || leader.email} · {leader.role === "rover" ? "Rover" : "Vedoucí"}</option>)}
              </select>
              <button type="button" className={styles.primary} disabled={!props.selectedLeaderId} onClick={props.onAddLeader}><UserPlus size={17} /> Přidat</button>
            </div>
            {!availableLeaders.length && <p className={styles.hint}>Všichni dostupní vedoucí už jsou k výpravě přiřazeni.</p>}
          </section>

          <section className={styles.card}>
            <h3>Přidat externí osobu</h3>
            <div className={styles.externalGrid}>
              <label><span>Jméno</span><input value={props.externalName} onChange={(event) => props.setExternalName(event.target.value)} /></label>
              <label><span>Role</span><select value={props.externalRole} onChange={(event) => props.setExternalRole(event.target.value as "leader" | "rover")}><option value="leader">Vedoucí</option><option value="rover">Rover</option></select></label>
              <label><span>Věk</span><input value={props.externalAge} inputMode="numeric" onChange={(event) => props.setExternalAge(event.target.value)} /></label>
              <label><span>Sleva</span><select value={props.externalBenefit} onChange={(event) => props.setExternalBenefit(event.target.value)}><option value="">Bez slevy</option>{props.benefitOptions.map((benefit) => <option key={benefit} value={benefit}>{benefit}</option>)}</select></label>
            </div>
            <div className={styles.externalActions}>
              <label><input type="checkbox" checked={props.saveAsPreset} onChange={(event) => props.setSaveAsPreset(event.target.checked)} /> Uložit pro další výpravy</label>
              <button type="button" className={styles.primary} disabled={!props.externalName.trim()} onClick={props.onAddExternal}><UserPlus size={17} /> Přidat externího</button>
            </div>
          </section>

          {props.presets.length > 0 && <section className={styles.card}><h3>Uložené osoby</h3><div className={styles.chips}>{props.presets.map((preset) => <div key={preset._id}><button type="button" onClick={() => props.onAddPreset(preset._id)}>{preset.name} · {preset.role === "rover" ? "Rover" : "Vedoucí"}</button><button type="button" aria-label={`Smazat ${preset.name}`} onClick={() => props.onRemovePreset(preset._id)}><X size={14} /></button></div>)}</div></section>}

          <section className={styles.assigned}>
            <div className={styles.assignedHeading}><h3>Přiřazení k výpravě</h3><span>{props.staff.length}</span></div>
            {!props.staff.length ? <p className={styles.empty}>Zatím nikdo není přiřazen.</p> : props.staff.map((person) => <article key={person._id}><div><strong>{person.user?.name || person.name}</strong><span>{person.role === "rover" ? "Rover" : "Vedoucí"}{typeof person.age === "number" ? ` · ${person.age} let` : ""}{person.benefit ? ` · ${person.benefit}` : ""}</span></div><button type="button" aria-label={`Odebrat ${person.user?.name || person.name}`} onClick={() => props.onRemoveStaff(person._id)}><Trash2 size={17} /></button></article>)}
          </section>
        </div>
      </section>
    </div>
  );
}
