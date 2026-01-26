import type { Metadata } from "next";
import "./globals.css";


import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "skautREG",
  description: "Light Green Theme UI Kit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
