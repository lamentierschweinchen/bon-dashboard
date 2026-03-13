import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "700", "800"],
});

export const metadata: Metadata = {
  title: "Battle of Nodes — Live Dashboard",
  description:
    "Real-time analytics for the MultiversX Battle of Nodes shadow fork. Track nodes, transactions, and network health.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Battle of Nodes — Live Dashboard",
    description:
      "Real-time analytics for the MultiversX Battle of Nodes shadow fork.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
