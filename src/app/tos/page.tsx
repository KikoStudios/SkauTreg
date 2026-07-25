import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Podmínky používání | SkauTreg" };

const operator = process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME || "Provozovatel bude doplněn";
const address = process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS || "Adresa bude doplněna";
const effectiveDate = process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || "návrh";
const securityEmail = process.env.NEXT_PUBLIC_SECURITY_EMAIL || "security@example.invalid";

const sections: LegalSection[] = [
  {
    id: "provozovatel",
    title: "1. Provozovatel a přijetí podmínek",
    content: <p>Službu SkauTreg provozuje <strong>{operator}</strong>, {address}. Používáním služby potvrzujete, že jste oprávněni jednat za svůj účet nebo oddíl a budete dodržovat tyto podmínky.</p>,
  },
  {
    id: "ucet",
    title: "2. Účet a přístup",
    content: <p>Přihlášení zajišťuje Clerk. Chraňte své přihlašovací údaje a tajné RSVP či ticketové odkazy. Role v oddílu určují, co smíte zobrazit a měnit; obcházení oprávnění je zakázáno.</p>,
  },
  {
    id: "odpovednost",
    title: "3. Odpovědnost oddílu",
    content: <p>Vedení oddílu odpovídá za správnost zadaných údajů, oprávnění ke zpracování údajů členů a dětí, správu rolí, kontrolu plateb a obsahu před odesláním a včasné odebrání přístupu osobám, které jej již nepotřebují.</p>,
  },
  {
    id: "beta",
    title: "4. Beta funkce",
    content: <p>Finance, sdílení jízdenek, společné dokumenty a centrum zpětné vazby mohou být označeny jako Beta. Mohou se měnit nebo být dočasně nedostupné; důležitá rozhodnutí a finanční výsledky vždy ověřte.</p>,
  },
  {
    id: "integrace",
    title: "5. Integrace třetích stran",
    content: <p>Volitelné integrace Google/Gmail, Mapy.com, Browserless/IDOS a Supernotes podléhají také podmínkám jejich poskytovatelů. Připojení může kdykoli zrušit oprávněný vedoucí. Služba neposkytuje třetím stranám tajné odkazy za účelem generování QR kódů.</p>,
  },
  {
    id: "obsah",
    title: "6. Obsah a přijatelné použití",
    content: <p>Nesmíte ukládat protiprávní obsah, škodlivý kód ani neoprávněně získané osobní údaje, narušovat službu nebo rozesílat nevyžádanou poštu. Za obsah vložený oddílem odpovídá příslušný oddíl.</p>,
  },
  {
    id: "licence",
    title: "7. Licence",
    content: <p>Zdrojový kód projektu je poskytován pod licencí MIT. Licence ke kódu sama o sobě neposkytuje práva k osobním údajům, účtům, názvu služby ani datům jednotlivých oddílů.</p>,
  },
  {
    id: "dostupnost",
    title: "8. Dostupnost a odpovědnost",
    content: <p>Služba je poskytována bez záruky nepřetržité dostupnosti. Odpovědnost nelze vyloučit tam, kde to zákon nepřipouští. Plánované změny a incidenty budeme řešit přiměřeně jejich dopadu.</p>,
  },
  {
    id: "ukonceni",
    title: "9. Ukončení a kontakt",
    content: <p>Účet lze ukončit kontrolovanou žádostí v profilu. Před výmazem musí vlastník převést oddíly. Bezpečnostní problém oznamte neveřejně na <a href={`mailto:${securityEmail}`}>{securityEmail}</a>.</p>,
  },
];

export default function TermsPage() {
  return <LegalPage title="Podmínky používání" lead={`Účinné od ${effectiveDate}. Podmínky služby SkauTreg.`} sections={sections} />;
}
