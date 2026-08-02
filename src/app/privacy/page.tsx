import type { Metadata } from "next";
import LegalPage, { type LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Ochrana osobních údajů | SkauTreg" };

const operator = process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME || "Provozovatel bude doplněn";
const address = process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS || "Adresa bude doplněna";
const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL || "privacy@example.invalid";
const securityEmail = process.env.NEXT_PUBLIC_SECURITY_EMAIL || "security@example.invalid";
const effectiveDate = process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || "návrh";

const sections: LegalSection[] = [
  {
    id: "spravce",
    title: "1. Správce a kontakt",
    content: <><p>Správcem služby je <strong>{operator}</strong>, {address}.</p><p>Ochrana osobních údajů: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Bezpečnostní incidenty: <a href={`mailto:${securityEmail}`}>{securityEmail}</a>.</p></>,
  },
  {
    id: "udaje",
    title: "2. Jaké údaje zpracováváme",
    content: <><p>Zpracováváme údaje účtu a vedení, členské a zákonné-zástupcovské kontakty, údaje o výpravách, účasti a odpovědích RSVP, platbách, dopravě, dokumentech, e-mailových konceptech a technické bezpečnostní údaje.</p><p>Údaje dětí zadává oprávněné vedení oddílu; oddíl odpovídá za právní titul a informování rodičů nebo zákonných zástupců.</p></>,
  },
  {
    id: "ucely",
    title: "3. Účely a právní důvody",
    content: <p>Údaje používáme k poskytnutí služby, řízení přístupu, organizaci oddílu a výprav, komunikaci, bezpečnosti, řešení incidentů a splnění právních povinností. Volitelná analytika se spouští pouze po souhlasu, který lze odvolat.</p>,
  },
  {
    id: "dodavatele",
    title: "4. Dodavatelé a přenosy",
    content: <><p>Služba používá Clerk (přihlášení), Convex (databáze a soubory) a Vercel (hosting). Podle zapnutých funkcí může komunikovat s Google/Gmail, Mapy.com, Browserless/IDOS a Supernotes.</p><p>Pro provozní dohled mohou být použity Sentry v německém regionu, Axiom výhradně v EU Central, PostHog Cloud EU až po souhlasu a Better Stack. Pokud požadovaný evropský region není dostupný, daná integrace zůstane vypnutá.</p></>,
  },
  {
    id: "odkazy",
    title: "5. Odkazy RSVP a jízdenek",
    content: <p>RSVP a veřejně sdílené jízdenky používají tajný odkaz fungující jako přístupový klíč. Odkaz nepřeposílejte, nevkládejte do veřejných služeb a při podezření na únik požádejte vedoucího o jeho zrušení nebo obnovení.</p>,
  },
  {
    id: "uchovani",
    title: "6. Uchování a zabezpečení",
    content: <p>Údaje uchováváme po dobu aktivního účtu a oddílové evidence, dále po dobu nutnou pro právní povinnosti, řešení sporů a omezené zálohy. Přístup je řízen rolí; integrační tajemství jsou šifrována. Žádná služba však nemůže slíbit absolutní bezpečnost.</p>,
  },
  {
    id: "prava",
    title: "7. Export, oprava a výmaz",
    content: <p>V profilu lze stáhnout export údajů svázaných s účtem a podat žádost o výmaz. Výmaz je kontrolovaný proces: vlastník musí nejprve převést oddíly; členské a oddílové záznamy se nemažou kaskádou. Dokončení zahrnuje anonymizaci profilu a navazující odstranění účtu u Clerk a analytické osoby u PostHog.</p>,
  },
  {
    id: "souhlas",
    title: "8. Analytické preference",
    content: <p>Nezbytné zpracování je vždy zapnuté. Analytika a případný plně maskovaný záznam relace vyžadují výslovný souhlas. Souhlas, jeho verzi a čas ukládáme do prohlížeče; po odvolání se sběr zastaví a analytický stav se resetuje.</p>,
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Ochrana osobních údajů" lead={`Účinné od ${effectiveDate}. Přesný popis zpracování v aplikaci SkauTreg.`} sections={sections} />;
}
