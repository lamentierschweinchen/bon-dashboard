import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const roobert = localFont({
  src: [
    {
      path: "../fonts/RoobertPRO-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/RoobertPRO-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/RoobertPRO-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/RoobertPRO-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/RoobertPRO-Heavy.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-roobert",
  display: "swap",
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
    <html lang="en" className={roobert.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
