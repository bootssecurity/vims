import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIMS Platform",
  description:
    "Vehicle inventory, CRM, and dealer website platform built as a modular monolith.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
