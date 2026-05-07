import type { Metadata } from "next";
import "./globals.css";
import "./design-system.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://brokerbriefs.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "BrokerBriefs Extractors",
  description: "Structured statement extraction tools for credit cards and bank statements."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
