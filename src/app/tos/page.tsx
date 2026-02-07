"use client";

import React, { useState } from "react";
import Link from "next/link";

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f4f4f5',
    fontFamily: 'Inter, sans-serif'
  },
  header: {
    borderBottom: '2px solid black',
    backgroundColor: 'white',
    padding: '0.75rem 1.5rem'
  },
  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'inherit',
    maxWidth: '150px'
  },
  logoImg: {
    width: '100%',
    height: 'auto',
    maxWidth: '140px'
  },
  langButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  langButton: (active: boolean) => ({
    padding: '0.5rem 1rem',
    border: '2px solid black',
    fontWeight: '500',
    backgroundColor: active ? '#86efac' : 'white',
    boxShadow: active ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderRadius: '8px'
  }),
  mainContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '2rem 1.5rem'
  },
  flexContainer: {
    display: 'flex',
    gap: '1.5rem'
  },
  sidebar: {
    width: '256px',
    flexShrink: 0
  },
  sidebarBox: {
    backgroundColor: 'white',
    border: '2px solid black',
    boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
    position: 'sticky' as const,
    top: '2rem',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  sidebarHeader: {
    padding: '1rem',
    borderBottom: '2px solid black',
    backgroundColor: '#86efac',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    textTransform: 'uppercase' as const,
    borderRadius: '10px 10px 0 0'
  },
  sidebarContent: {
    padding: '0.5rem'
  },
  tabButton: (active: boolean) => ({
    width: '100%',
    textAlign: 'left' as const,
    padding: '0.5rem 0.75rem',
    marginBottom: '0.25rem',
    border: '2px solid black',
    fontSize: '0.875rem',
    backgroundColor: active ? '#86efac' : 'white',
    boxShadow: active ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
    transition: 'all 0.2s',
    borderRadius: '8px'
  }),
  contentArea: {
    flex: 1
  },
  contentBox: {
    backgroundColor: 'white',
    border: '2px solid black',
    boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)',
    padding: '2rem',
    borderRadius: '12px'
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid black'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: 'black'
  },
  sectionContent: {
    color: '#18181b',
    lineHeight: '1.75'
  },
  paragraph: {
    marginBottom: '0.75rem'
  },
  bulletPoint: {
    marginLeft: '1rem'
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid black'
  },
  navButton: (disabled: boolean) => ({
    padding: '0.5rem 1.5rem',
    border: '2px solid black',
    fontWeight: '500',
    backgroundColor: disabled ? '#e5e5e5' : 'white',
    color: disabled ? '#9ca3af' : 'black',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : undefined,
    borderRadius: '8px'
  })
};

export default function TermsOfService() {
  const [language, setLanguage] = useState<"cs" | "en">("cs");
  const [activeSection, setActiveSection] = useState(0);

  const content = {
    cs: {
      title: "Podmínky používání",
      sections: [
        { title: "1. Souhlas s podmínkami", content: `Vítejte v aplikaci SkautREG!\n\nPřístupem a používáním této aplikace souhlasíte s těmito podmínkami používání.\n\nTato aplikace je open-source projekt vytvořený a spravovaný KAO (dříve známou jako kikostudios).\n\nAPLIKACE JE POSKYTOVÁNA „TAK JAK JE" bez jakýchkoliv záruk. Pokud s těmito podmínkami nesouhlasíte, aplikaci nepoužívejte.` },
        { title: "2. Open-Source a omezení záruky", content: `TOTO JE KRITICKÁ SEKCE - PŘEČTĚTE SI JI POZORNĚ:\n\nTato aplikace je open-source software vytvořený komunitou kikosutdios (dříve KAO).\n\nAPLIKACE JE POSKYTOVÁNA „TAK JAK JE", BEZ ZÁRUKY JAKÉHOKOLIV DRUHU, ať už výslovné nebo předpokládané.\n\nKomunita kikosutdios:\n• NEGARANTUJE bezpečnost vašich dat\n• NENESE ODPOVĚDNOST za ztrátu dat\n• NENESE ODPOVĚDNOST za výpadky služby\n• NERUČÍ za funkčnost aplikace\n• NENESE ODPOVĚDNOST za jakékoliv škody\n\nPOUŽÍVÁTE TUTO APLIKACI NA VLASTNÍ RIZIKO.` },
        { title: "3. Oprávněné použití", content: `Tuto aplikaci můžete používat pro:\n\n• Správu skautských oddílů\n• Vedení evidence členů\n• Plánování výprav\n• Správu základen\n• Komunikaci v rámci oddílu\n\nNESMÍTE aplikaci používat pro:\n• Nezákonné účely\n• Obtěžování jiných uživatelů\n• Šíření malware nebo škodlivého kódu\n• Narušování bezpečnosti služby\n• Porušování práv třetích stran` },
        { title: "4. Uživatelské účty", content: `Registrace:\n• Musíte poskytnout pravdivé údaje\n• Jste odpovědní za zabezpečení vašeho účtu\n• Nesmíte sdílet přístupové údaje\n\nAutentifikace je spravována službou Clerk:\n• Platí jejich vlastní podmínky použití\n• Platí jejich zásady ochrany osobních údajů\n\nMůžeme zrušit váš účet pokud:\n• Porušíte tyto podmínky\n• Používáte službu nezákonně\n• Ohrozíte bezpečnost ostatních` },
        { title: "5. Data a obsah", content: `Vaše data:\n• Zůstávají vaším vlastnictvím\n• Jste odpovědní za jejich obsah\n• Musíte mít právo je zde ukládat\n\nData jsou uložena v Convex databázi:\n• Platí jejich vlastní podmínky\n• Platí jejich zásady ochrany údajů\n\nJAKO OPEN-SOURCE PROJEKT:\n• Nemůžeme garantovat bezpečnost dat\n• Nemůžeme garantovat dostupnost dat\n• Nenese odpovědnost za ztrátu dat\n\nDOPORUČUJEME pravidelné zálohy vašich důležitých dat.` },
        { title: "6. Dostupnost služby", content: `DŮLEŽITÉ PROHLÁŠENÍ:\n\nJako open-source projekt NEMŮŽEME garantovat:\n• 24/7 dostupnost\n• Nepřerušený provoz\n• Bezchybný běh aplikace\n\nSlužba může být:\n• Dočasně nedostupná\n• Přerušena pro údržbu\n• Zastavena bez předchozího upozornění\n\nNENESEME ODPOVĚDNOST za:\n• Výpadky služby\n• Ztrátu přístupu k datům\n• Nedostupnost funkcí\n• Škody způsobené výpadkem` },
        { title: "7. Třetí strany", content: `Aplikace využívá následující služby třetích stran:\n\nClerk (autentifikace):\n• Spravuje uživatelské účty\n• Jejich T&C platí: clerk.com/terms\n\nConvex (databáze):\n• Ukládá všechna data\n• Jejich T&C platí: convex.dev/terms\n\nNetlify (hosting):\n• Hostuje aplikaci\n• Jejich T&C platí: netlify.com/legal/terms-of-use\n\nPoužíváním naší aplikace souhlasíte také s podmínkami těchto služeb.\n\nNENESEME ODPOVĚDNOST za jednání těchto třetích stran.` },
        { title: "8. Duševní vlastnictví", content: `Open-Source Licence:\n• Zdrojový kód je k dispozici na GitHub\n• Platí licence uvedená v repository\n• Můžete kód používat dle této licence\n\nKomunita kikosutdios si vyhrazuje práva k:\n• Názvu „SkautREG"\n• Logu a značce\n• Designu aplikace\n\nVáš obsah:\n• Zůstává vaším vlastnictvím\n• Udělujete nám licenci k jeho zobrazení v aplikaci\n• Můžete jej kdykoli smazat` },
        { title: "9. Omezení odpovědnosti", content: `TOTO JE KRITICKÁ PRÁVNÍ SEKCE:\n\nV MAXIMÁLNÍM ROZSAHU POVOLENÉM ZÁKONEM:\n\nKomunita kikosutdios (dříve KAO) NENESE ODPOVĚDNOST za:\n\n• PŘÍMÉ škody (ztráta dat, výpadky, chyby)\n• NEPŘÍMÉ škody (ušlý zisk, reputace)\n• NÁSLEDNÉ škody\n• SPECIÁLNÍ škody\n• NÁHODNÉ škody\n\nA to ani v případě, že jsme byli na možnost takových škod upozorněni.\n\nVAŠE JEDINÁ A VÝLUČNÁ NÁHRADA je ukončení používání této služby.` },
        { title: "10. Odpovědnost uživatele", content: `Používáním této aplikace berete na vědomí a přijímáte odpovědnost za:\n\n• Vaše použití aplikace\n• Správnost vašich dat\n• Dodržování zákonů a předpisů\n• Ochranu přístupových údajů\n• Důsledky vašich činností\n\nJste odpovědní za:\n• Právní compliance (GDPR, místní zákony)\n• Přesnost a správnost dat\n• Souhlas rodičů pro nezletilé\n• Zabezpečení účtu\n• Způsob jakým aplikaci používáte` },
        { title: "11. GDPR a ochrana údajů", content: `Prohlášení o GDPR compliance:\n\nJako open-source projekt NEMŮŽEME plně garantovat soulad s GDPR.\n\nSnažíme se dodržovat:\n• Minimalizaci dat\n• Práva subjektů údajů\n• Transparentnost zpracování\n\nALE:\n• Nemůžeme garantovat absolutní bezpečnost\n• Nemůžeme garantovat okamžité plnění žádostí\n• Technické limity mohou bránit plné compliance\n\nPro skautské oddíly:\n• Odpovědnost za GDPR leží na vedoucích oddílu\n• Musíte mít souhlas rodičů pro děti\n• Musíte dodržovat národní legislativu` },
        { title: "12. Změny podmínek", content: `Vyhrazujeme si právo změnit tyto podmínky kdykoli.\n\nO změnách budete informováni:\n• In-app notifikací\n• E-mailem (pokud je k dispozici)\n• Oznámením na GitHub\n\nPokračováním v používání aplikace po změnách vyjadřujete souhlas s novými podmínkami.\n\nPokud nesouhlasíte s novými podmínkami, musíte přestat aplikaci používat.\n\nVerze: 1.0\nDatum poslední aktualizace: Leden 2025` },
        { title: "13. Ukončení", content: `Můžete ukončit používání kdykoli:\n• Smazáním vašeho účtu\n• Přestáním používat aplikaci\n\nMůžeme ukončit váš přístup pokud:\n• Porušíte tyto podmínky\n• Používáte službu nezákonně\n• Ohrozíte ostatní uživatele\n• Z jakéhokoliv jiného důvodu (nebo bez důvodu)\n\nPo ukončení:\n• Ztratíte přístup k vašim datům\n• Data mohou být smazána\n• Některá data mohou zůstat v zálohách` },
        { title: "14. Přispívání a komunita", content: `Tato aplikace je komunitní projekt!\n\nJste vítáni přispět:\n• Kódem (pull requesty)\n• Hlášením chyb (issues)\n• Návrhy funkcí\n• Dokumentací\n• Překlady\n\nGitHub repository: https://github.com/KikoStudios/SkauTreg\n\nPřispěním souhlasíte s:\n• Open-source licencí projektu\n• Code of Conduct\n• Že váš příspěvek může být použit v projektu\n\nDěkujeme všem přispěvatelům! 💚` },
        { title: "15. Rozhodné právo", content: `Tyto podmínky se řídí právem České republiky.\n\nJakékoliv spory budou řešeny:\n• Primárně dohodou\n• Případně mediací\n• V krajním případě soudem v ČR\n\nPokud je některé ustanovení neplatné:\n• Ostatní ustanovení zůstávají v platnosti\n• Neplatné ustanovení bude nahrazeno platným s podobným účelem\n\nProhlášení:\n• Jsme open-source komunita, ne firma\n• Pro právní rady se obraťte na advokáta\n• Tyto podmínky jsou poskytovány „v dobré víře"` },
        { title: "16. Kontakt", content: `Máte otázky k podmínkám?\n\nKontaktujte KAO:\n• GitHub Issues: https://github.com/KikoStudios/SkauTreg\n• GitHub Discussions pro obecné otázky\n\nPro nahlášení:\n• Bezpečnostních problémů: GitHub Security Advisory\n• Chyb: GitHub Issues\n• Návrhů funkcí: GitHub Discussions\n\nPROSÍME O SHOVÍVAVOST:\n• Jsme dobrovolníci\n• Odpovědi mohou trvat\n• Nemáme právní oddělení\n\nDěkujeme za používání SkautREG! 🎒` }
      ]
    },
    en: {
      title: "Terms of Service",
      sections: [
        { title: "1. Agreement to Terms", content: `Welcome to the SkautREG application!\n\nBy accessing and using this application, you agree to these terms of service.\n\nThis application is an open-source project created and maintained by KAO.\n\nTHE APPLICATION IS PROVIDED "AS IS" without any warranties. If you do not agree to these terms, do not use the application.` },
        { title: "2. Open-Source and Warranty Disclaimer", content: `THIS IS A CRITICAL SECTION - READ IT CAREFULLY:\n\nThis application is open-source software created by KAO.\n\nTHE APPLICATION IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, express or implied.\n\nKAO:\n• DOES NOT GUARANTEE the security of your data\n• IS NOT LIABLE for data loss\n• IS NOT LIABLE for service outages\n• DOES NOT WARRANT application functionality\n• IS NOT LIABLE for any damages\n\nYOU USE THIS APPLICATION AT YOUR OWN RISK.` },
        { title: "3. Acceptable Use", content: `You may use this application for:\n\n• Managing scout troops\n• Maintaining member records\n• Planning trips\n• Managing bases\n• Troop communication\n\nYou MUST NOT use the application for:\n• Illegal purposes\n• Harassing other users\n• Distributing malware or harmful code\n• Compromising service security\n• Violating third-party rights` },
        { title: "4. User Accounts", content: `Registration:\n• You must provide truthful information\n• You are responsible for securing your account\n• You must not share credentials\n\nAuthentication is managed by Clerk:\n• Their own terms of service apply\n• Their privacy policy applies\n\nWe may terminate your account if:\n• You violate these terms\n• You use the service illegally\n• You compromise others' security` },
        { title: "5. Data and Content", content: `Your data:\n• Remains your property\n• You are responsible for its content\n• You must have the right to store it here\n\nData is stored in Convex database:\n• Their own terms apply\n• Their privacy policy applies\n\nAS AN OPEN-SOURCE PROJECT:\n• We cannot guarantee data security\n• We cannot guarantee data availability\n• We are not liable for data loss\n\nWE RECOMMEND regular backups of your important data.` },
        { title: "6. Service Availability", content: `IMPORTANT STATEMENT:\n\nAs an open-source project we CANNOT guarantee:\n• 24/7 availability\n• Uninterrupted operation\n• Error-free application\n\nThe service may be:\n• Temporarily unavailable\n• Interrupted for maintenance\n• Stopped without prior notice\n\nWE ARE NOT LIABLE for:\n• Service outages\n• Loss of data access\n• Feature unavailability\n• Damages caused by outages` },
        { title: "7. Third Parties", content: `The application uses the following third-party services:\n\nClerk (authentication):\n• Manages user accounts\n• Their T&C apply: clerk.com/terms\n\nConvex (database):\n• Stores all data\n• Their T&C apply: convex.dev/terms\n\nNetlify (hosting):\n• Hosts the application\n• Their T&C apply: netlify.com/legal/terms-of-use\n\nBy using our application, you also agree to the terms of these services.\n\nWE ARE NOT LIABLE for the actions of these third parties.` },
        { title: "8. Intellectual Property", content: `Open-Source License:\n• Source code is available on GitHub\n• The license stated in the repository applies\n• You may use the code according to this license\n\nKAO reserves rights to:\n• The "SkautREG" name\n• Logo and branding\n• Application design\n\nYour content:\n• Remains your property\n• You grant us a license to display it in the app\n• You may delete it at any time` },
        { title: "9. Limitation of Liability", content: `THIS IS A CRITICAL LEGAL SECTION:\n\nTO THE MAXIMUM EXTENT PERMITTED BY LAW:\n\nKAO IS NOT LIABLE for:\n\n• DIRECT damages (data loss, outages, errors)\n• INDIRECT damages (lost profit, reputation)\n• CONSEQUENTIAL damages\n• SPECIAL damages\n• INCIDENTAL damages\n\nEven if we have been advised of the possibility of such damages.\n\nYOUR SOLE AND EXCLUSIVE REMEDY is to stop using this service.` },
        { title: "10. User Responsibility", content: `By using this application, you acknowledge and accept responsibility for:\n\n• Your use of the application\n• Accuracy of your data\n• Compliance with laws and regulations\n• Protecting your account credentials\n• Consequences of your actions\n\nYou are responsible for:\n• Legal compliance (GDPR, local laws)\n• Data accuracy and correctness\n• Parental consent for minors\n• Account security\n• How you use the application` },
        { title: "11. GDPR and Data Protection", content: `GDPR Compliance Statement:\n\nAs an open-source project, we CANNOT fully guarantee GDPR compliance.\n\nWe try to follow:\n• Data minimization\n• Data subject rights\n• Processing transparency\n\nBUT:\n• We cannot guarantee absolute security\n• We cannot guarantee immediate request fulfillment\n• Technical limitations may prevent full compliance\n\nFor scout troops:\n• GDPR responsibility lies with troop leaders\n• You must have parental consent for children\n• You must comply with national legislation` },
        { title: "12. Changes to Terms", content: `We reserve the right to change these terms at any time.\n\nYou will be notified of changes:\n• Via in-app notification\n• Via email (if available)\n• Via GitHub announcement\n\nContinued use of the application after changes indicates acceptance of new terms.\n\nIf you do not agree to new terms, you must stop using the application.\n\nVersion: 1.0\nLast updated: January 2025` },
        { title: "13. Termination", content: `You may terminate use at any time:\n• By deleting your account\n• By stopping use of the application\n\nWe may terminate your access if:\n• You violate these terms\n• You use the service illegally\n• You endanger other users\n• For any other reason (or no reason)\n\nAfter termination:\n• You will lose access to your data\n• Data may be deleted\n• Some data may remain in backups` },
        { title: "14. Contributing and Community", content: `This application is a community project!\n\nYou are welcome to contribute:\n• Code (pull requests)\n• Bug reports (issues)\n• Feature suggestions\n• Documentation\n• Translations\n\nGitHub repository: https://github.com/KikoStudios/SkauTreg\n\nBy contributing you agree to:\n• The project's open-source license\n• Code of Conduct\n• Your contribution may be used in the project\n\nThank you to all contributors! 💚` },
        { title: "15. Governing Law", content: `These terms are governed by the law of the Czech Republic.\n\nAny disputes will be resolved:\n• Primarily by agreement\n• Possibly by mediation\n• As a last resort by court in the Czech Republic\n\nIf any provision is invalid:\n• Other provisions remain valid\n• Invalid provision will be replaced with a valid one with similar purpose\n\nStatement:\n• We are an open-source community, not a company\n• Consult a lawyer for legal advice\n• These terms are provided "in good faith"` },
        { title: "16. Contact", content: `Questions about the terms?\n\nContact KAO:\n• GitHub Issues: https://github.com/KikoStudios/SkauTreg\n• GitHub Discussions for general questions\n\nFor reporting:\n• Security issues: GitHub Security Advisory\n• Bugs: GitHub Issues\n• Feature suggestions: GitHub Discussions\n\nPLEASE BE PATIENT:\n• We are volunteers\n• Responses may take time\n• We don't have a legal department\n\nThank you for using SkautREG! 🎒` }
      ]
    }
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const processed = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      
      return (
        <p key={i} style={line.startsWith('•') ? styles.bulletPoint : styles.paragraph}>
          {processed}
        </p>
      );
    });
  };

  const currentContent = content[language];
  const currentSection = currentContent.sections[activeSection];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.logo}>
            <img src="/Logo-light.svg" alt="SkautREG" style={styles.logoImg} />
          </Link>
          <div style={styles.langButtons}>
            <button onClick={() => setLanguage("cs")} style={styles.langButton(language === "cs")}>CS</button>
            <button onClick={() => setLanguage("en")} style={styles.langButton(language === "en")}>EN</button>
          </div>
        </div>
      </div>
      <div style={styles.mainContent}>
        <div style={styles.flexContainer}>
          <div style={styles.sidebar}>
            <div style={styles.sidebarBox}>
              <div style={styles.sidebarHeader}>{language === "cs" ? "Obsah" : "Contents"}</div>
              <div style={styles.sidebarContent}>
                {currentContent.sections.map((section, index) => (
                  <button key={index} onClick={() => setActiveSection(index)} style={styles.tabButton(activeSection === index)}>{section.title}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={styles.contentArea}>
            <div style={styles.contentBox}>
              <h1 style={styles.title}>{currentContent.title}</h1>
              <div>
                <h2 style={styles.sectionTitle}>{currentSection.title}</h2>
                <div style={styles.sectionContent}>{renderContent(currentSection.content)}</div>
              </div>
              <div style={styles.navigation}>
                <button onClick={() => setActiveSection(Math.max(0, activeSection - 1))} disabled={activeSection === 0} style={styles.navButton(activeSection === 0)}>{language === "cs" ? "← Předchozí" : "← Previous"}</button>
                <button onClick={() => setActiveSection(Math.min(currentContent.sections.length - 1, activeSection + 1))} disabled={activeSection === currentContent.sections.length - 1} style={styles.navButton(activeSection === currentContent.sections.length - 1)}>{language === "cs" ? "Další →" : "Next →"}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
