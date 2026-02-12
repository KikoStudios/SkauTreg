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

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<"cs" | "en">("cs");
  const [activeSection, setActiveSection] = useState(0);

  const content = {
    cs: {
      title: "Zásady ochrany osobních údajů",
      sections: [
        {
          title: "1. Úvod",
          content: `Tata aplikace je open-source projekt vytvořený organizací KAO. Vítejte v našich zásadách ochrany osobních údajů.\n\nPřijímáním těchto zásad berete na vědomí, že používáte software poskytovaný „TAK JAK JE" bez jakýchkoliv záruk.\n\nJako open-source projekt nemůžeme garantovat absolutní bezpečnost dat. Používáte tuto aplikaci na vlastní riziko.`
        },
        {
          title: "2. Open-Source prohlášení",
          content: `Tento software je open-source projekt spravovaný organizací KAO.\n\nAplikace je poskytována TAK JAK JE, bez záruky jakéhokoliv druhu, ať už výslovné nebo předpokládané.\n\nOrganizace KAO neručí za:\n• Bezpečnost vašich dat\n• Dostupnost služby\n• Ztrátu dat\n• Jakékoliv škody vzniklé používáním této aplikace`
        },
        {
          title: "3. Jaké údaje sbíráme",
          content: `Sbíráme minimální množství údajů potřebných pro provoz aplikace:\n\nAutentifikační údaje:\n• E-mailová adresa\n• Jméno a příjmení\n• Autentifikační tokeny (spravované službou Clerk)\n\nDashboard data:\n• Oddíly (troops)\n• Základny (bases)\n• Členové (members)\n• Výpravy (trips)\n• Účast (participations)\n\nVšechna data jsou uložena v Convex databázi.`
        },
        {
          title: "4. Jak používáme vaše údaje",
          content: `Vaše údaje jsou používány výhradně pro:\n\n• Provoz základních funkcí aplikace\n• Zobrazení vašich oddílů a základen\n• Správu členů a výprav\n• Autentifikaci a autorizaci\n\nData NEJSOU:\n• Prodávána třetím stranám\n• Používána pro marketing\n• Sdílena bez vašeho souhlasu\n• Používána k profilování`
        },
        {
          title: "5. Cookies a lokální úložiště",
          content: `Aplikace používá:\n\nCookies pro:\n• Autentifikaci (Clerk)\n• Uchovávání relace\n\nLocal Storage pro:\n• Nastavení UI\n• Dočasný stav aplikace\n\nNepoužíváme tracking cookies nebo analytické služby třetích stran.`
        },
        {
          title: "6. Bezpečnost dat",
          content: `DŮLEŽITÉ PROHLÁŠENÍ:\n\nJako open-source projekt NEMŮŽEME garantovat absolutní bezpečnost vašich dat.\n\nPřestože používáme standardní bezpečnostní praktiky:\n• Šifrování při přenosu (HTTPS)\n• Bezpečnou autentifikaci (Clerk)\n• Bezpečnostní opatření Convex databáze\n\nNemůžeme nést odpovědnost za:\n• Úniky dat\n• Ztrátu dat\n• Bezpečnostní incidenty\n• Nedostupnost služby\n\nPOUŽÍVÁTE NA VLASTNÍ RIZIKO.`
        },
        {
          title: "7. Sdílení dat s třetími stranami",
          content: `Vaše data jsou zpracovávána následujícími službami:\n\nClerk (autentifikace):\n• Spravuje přihlašování\n• Ukládá autentifikační údaje\n• Jejich vlastní privacy policy platí\n\nConvex (databáze):\n• Ukládá všechna aplikační data\n• Jejich vlastní privacy policy platí\n\nNetlify (hosting):\n• Hostuje aplikaci\n• Jejich vlastní privacy policy platí\n\nKdyž používáte naši aplikaci, souhlasíte také s podmínkami těchto služeb.`
        },
        {
          title: "8. Vaše práva",
          content: `Máte právo na:\n\n• Přístup k vašim datům (přes aplikaci)\n• Opravu nesprávných údajů\n• Smazání vašich dat\n• Export vašich dat\n• Stažení souhlasu\n\nJak uplatnit svá práva:\n• Pro smazání účtu použijte funkci v nastavení\n• Pro export dat použijte funkci exportu\n• Pro ostatní požadavky kontaktujte tým kikosutdios\n\nPozn: Některá data mohou zůstat v zálohách až 30 dní.`
        },
        {
          title: "9. Dětské údaje",
          content: `Tato aplikace může být používána skautskými oddíly, které vedou evidence členů různých věkových kategorií.\n\nPro uživatele mladší 15 let:\n• Je vyžadován souhlas zákonného zástupce\n• Údaje dětí jsou chráněny stejně jako údaje dospělých\n• Rodiče/zákonní zástupci mají právo na přístup a smazání údajů\n\nJako open-source projekt nemůžeme plně garantovat GDPR compliance. Zodpovědnost leží na správcích oddílů.`
        },
        {
          title: "10. Změny těchto zásad",
          content: `Tyto zásady mohou být kdykoli změněny.\n\nO změnách budete informováni:\n• In-app notifikací\n• E-mailem (pokud je k dispozici)\n• Na GitHub repository\n\nPokračováním v používání aplikace po změnách souhlasíte s novými zásadami.\n\nAktuální verze: 1.0\nDatum poslední aktualizace: Leden 2025`
        },
        {
          title: "11. Omezení odpovědnosti",
          content: `TOTO JE KLÍČOVÁ SEKCE - PŘEČTĚTE SI JI POZORNĚ:\n\nJako open-source projekt poskytovaný organizací KAO:\n\nNENESEME ODPOVĚDNOST ZA:\n• Ztrátu nebo únik vašich dat\n• Dostupnost nebo výpadky služby\n• Chyby v aplikaci\n• Škody vzniklé používáním aplikace\n• Nedodržení GDPR nebo jiných předpisů\n\nAPLIKACE JE POSKYTOVÁNA „TAK JAK JE" bez jakýchkoliv záruk.\n\nPOUŽÍVÁNÍM TÉTO APLIKACE BERETE NA VĚDOMÍ A PŘIJÍMÁTE TATO RIZIKA.`
        },
        {
          title: "12. Nahlašování chyb",
          content: `Našli jste chybu? Pomožte nám!\n\nJako open-source projekt závisíme na komunitě:\n\n• Nahlaste chyby na našem GitHub repository\n• Otevřete issue s detailním popisem\n• Pokud umíte, navrhněte řešení\n• Přispějte kódem\n\nVážíme si každého příspěvku ke zlepšení aplikace!\n\nGitHub: https://github.com/KikoStudios/SkauTreg\n\nDěkujeme za pomoc s vylepšováním SkautREG!`
        },
        {
          title: "13. Kontakt",
          content: `Máte otázky ohledně ochrany osobních údajů?\n\nKontaktujte KAO:\n• GitHub Issues: https://github.com/KikoStudios/SkauTreg\n• GitHub Discussions pro obecné otázky\n\nProsím mějte na paměti:\n• Jsme open-source komunita\n• Odpovědi mohou trvat déle\n• Nejsme právní firma - pro právní rady se obraťte na advokáta\n\nPro urgentní bezpečnostní problémy: Nahlaste issue označený jako „security".`
        }
      ]    },
    en: {
      title: "Privacy Policy",
      sections: [
        {
          title: "1. Introduction",
          content: `This application is an open-source project created by KAO. Welcome to our privacy policy.\n\nBy accepting these policies, you acknowledge that you are using software provided "AS IS" without any warranties.\n\nAs an open-source project, we cannot guarantee absolute data security. You use this application at your own risk.`
        },
        {
          title: "2. Open-Source Statement",
          content: `This software is an open-source project managed by KAO.\n\nThe application is provided AS IS, without warranty of any kind, express or implied.\n\nKAO is NOT liable for:\n• Security of your data\n• Service availability\n• Data loss\n• Any damages arising from using this application`
        },
        {
          title: "3. What Data We Collect",
          content: `We collect minimal data necessary for the application to function:\n\nAuthentication data:\n• Email address\n• First and last name\n• Authentication tokens (managed by Clerk)\n\nDashboard data:\n• Troops\n• Bases\n• Members\n• Trips\n• Participations\n\nAll data is stored in Convex database.`
        },
        {
          title: "4. How We Use Your Data",
          content: `Your data is used exclusively for:\n\n• Operating basic application features\n• Displaying your troops and bases\n• Managing members and trips\n• Authentication and authorization\n\nData is NOT:\n• Sold to third parties\n• Used for marketing\n• Shared without your consent\n• Used for profiling`
        },
        {
          title: "5. Cookies and Local Storage",
          content: `The application uses:\n\nCookies for:\n• Authentication (Clerk)\n• Session management\n\nLocal Storage for:\n• UI preferences\n• Temporary application state\n\nWe do not use tracking cookies or third-party analytics.`
        },
        {
          title: "6. Data Security",
          content: `IMPORTANT STATEMENT:\n\nAs an open-source project, we CANNOT guarantee absolute security of your data.\n\nWhile we use standard security practices:\n• Encryption in transit (HTTPS)\n• Secure authentication (Clerk)\n• Convex database security measures\n\nWe cannot be held responsible for:\n• Data breaches\n• Data loss\n• Security incidents\n• Service unavailability\n\nYOU USE AT YOUR OWN RISK.`
        },
        {
          title: "7. Third-Party Data Sharing",
          content: `Your data is processed by the following services:\n\nClerk (authentication):\n• Manages login\n• Stores authentication data\n• Their own privacy policy applies\n\nConvex (database):\n• Stores all application data\n• Their own privacy policy applies\n\nNetlify (hosting):\n• Hosts the application\n• Their own privacy policy applies\n\nBy using our application, you also agree to the terms of these services.`
        },
        {
          title: "8. Your Rights",
          content: `You have the right to:\n\n• Access your data (through the app)\n• Correct inaccurate data\n• Delete your data\n• Export your data\n• Withdraw consent\n\nHow to exercise your rights:\n• To delete account, use settings feature\n• To export data, use export feature\n• For other requests, contact KAO\n\nNote: Some data may remain in backups for up to 30 days.`
        },
        {
          title: "9. Children's Data",
          content: `This application may be used by scout troops that maintain records of members of various age groups.\n\nFor users under 15:\n• Parental consent is required\n• Children's data is protected like adults' data\n• Parents/guardians have right to access and delete data\n\nAs an open-source project, we cannot fully guarantee GDPR compliance. Responsibility lies with troop administrators.`
        },
        {
          title: "10. Changes to These Policies",
          content: `These policies may be changed at any time.\n\nYou will be notified of changes:\n• Via in-app notification\n• Via email (if available)\n• On GitHub repository\n\nContinued use of the application after changes means you accept the new policies.\n\nCurrent version: 1.0\nLast updated: January 2025`
        },
        {
          title: "11. Limitation of Liability",
          content: `THIS IS A KEY SECTION - READ IT CAREFULLY:\n\nAs an open-source project provided by KAO:\n\nWE ARE NOT LIABLE FOR:\n• Loss or breach of your data\n• Service availability or outages\n• Application bugs\n• Damages arising from using the application\n• Non-compliance with GDPR or other regulations\n\nTHE APPLICATION IS PROVIDED "AS IS" without any warranties.\n\nBY USING THIS APPLICATION YOU ACKNOWLEDGE AND ACCEPT THESE RISKS.`
        },
        {
          title: "12. Bug Reporting",
          content: `Found a bug? Help us!\n\nAs an open-source project, we rely on the community:\n\n• Report bugs on our GitHub repository\n• Open an issue with detailed description\n• If you can, suggest a solution\n• Contribute code\n\nWe appreciate every contribution to improving the app!\n\nGitHub: https://github.com/KikoStudios/SkauTreg\n\nThank you for helping improve SkautREG!`
        },
        {
          title: "13. Contact",
          content: `Have questions about privacy?\n\nContact KAO:\n• GitHub Issues: https://github.com/KikoStudios/SkauTreg\n• GitHub Discussions for general questions\n\nPlease keep in mind:\n• We are an open-source community\n• Responses may take longer\n• We are not a law firm - consult a lawyer for legal advice\n\nFor urgent security issues: Report an issue marked "security".`
        }
      ]
    }
  };

  const renderContent = (text: string) => {
    // Split by newlines and process each line
    return text.split('\n').map((line, i) => {
      // Replace **bold** with <strong>
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
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.logo}>
            <img src="/logo_skautreg.svg" alt="SkautREG" style={styles.logoImg} />
          </Link>
          
          {/* Language Switcher */}
          <div style={styles.langButtons}>
            <button
              onClick={() => setLanguage("cs")}
              style={styles.langButton(language === "cs")}
            >
              CS
            </button>
            <button
              onClick={() => setLanguage("en")}
              style={styles.langButton(language === "en")}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <div style={styles.flexContainer}>
          {/* Left Sidebar - Tabs */}
          <div style={styles.sidebar}>
            <div style={styles.sidebarBox}>
              <div style={styles.sidebarHeader}>
                {language === "cs" ? "Obsah" : "Contents"}
              </div>
              <div style={styles.sidebarContent}>
                {currentContent.sections.map((section, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveSection(index)}
                    style={styles.tabButton(activeSection === index)}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content Area */}
          <div style={styles.contentArea}>
            <div style={styles.contentBox}>
              <h1 style={styles.title}>
                {currentContent.title}
              </h1>
              
              <div>
                <h2 style={styles.sectionTitle}>
                  {currentSection.title}
                </h2>
                <div style={styles.sectionContent}>
                  {renderContent(currentSection.content)}
                </div>
              </div>

              {/* Navigation */}
              <div style={styles.navigation}>
                <button
                  onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                  disabled={activeSection === 0}
                  style={styles.navButton(activeSection === 0)}
                >
                  {language === "cs" ? "← Předchozí" : "← Previous"}
                </button>
                <button
                  onClick={() => setActiveSection(Math.min(currentContent.sections.length - 1, activeSection + 1))}
                  disabled={activeSection === currentContent.sections.length - 1}
                  style={styles.navButton(activeSection === currentContent.sections.length - 1)}
                >
                  {language === "cs" ? "Další →" : "Next →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
