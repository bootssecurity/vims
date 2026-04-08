import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { NextAbstractWalletProvider } from "@/components/agw-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "VIMS Platform Admin",
  description:
    "Vehicle inventory, CRM, and dealer website platform built as a modular monolith.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <NextAbstractWalletProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </NextAbstractWalletProvider>
      </body>
    </html>
  );
}
