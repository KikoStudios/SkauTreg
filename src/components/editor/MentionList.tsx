import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { MapPin, TentTree, UserRound } from "lucide-react";
import type { MentionItem } from "./MentionSuggestion";
import styles from "./MentionList.module.css";

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectItem = (index: number) => { const item = props.items[index]; if (item) props.command(item); };

  useEffect(() => setSelectedIndex(0), [props.items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") { setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length); return true; }
      if (event.key === "ArrowDown") { setSelectedIndex((selectedIndex + 1) % props.items.length); return true; }
      if (event.key === "Enter") { selectItem(selectedIndex); return true; }
      return false;
    },
  }));

  return (
    <div className={styles.menu} role="listbox" aria-label="Výsledky zmínek">
      {props.items.length ? props.items.map((item, index) => (
        <button key={item.id} type="button" role="option" aria-selected={index === selectedIndex} onClick={() => selectItem(index)} className={`${styles.item} ${index === selectedIndex ? styles.selected : ""}`}>
          {item.image ? <img src={item.image} alt="" className={styles.avatar} /> : <span className={styles.typeIcon}>{iconForType(item.type)}</span>}
          <span className={styles.copy}><strong>{item.label}</strong>{item.sublabel && <span>{item.sublabel}</span>}</span>
          <span className={styles.badge}>{labelForType(item.type)}</span>
        </button>
      )) : <div className={styles.empty}>Žádné výsledky</div>}
    </div>
  );
});

function iconForType(type: string) {
  if (type === "user") return <UserRound size={14} />;
  if (type === "trip") return <TentTree size={14} />;
  return <MapPin size={14} />;
}

function labelForType(type: string) {
  if (type === "user") return "člověk";
  if (type === "trip") return "výprava";
  return "místo";
}

MentionList.displayName = "MentionList";
export default MentionList;
