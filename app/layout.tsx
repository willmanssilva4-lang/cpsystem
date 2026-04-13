import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ERPProvider } from "@/lib/context";
import { AppLayout } from "@/components/AppLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cpsystem - Gestão Financeira Inteligente",
  description: "Sistema de Gestão Financeira Inteligente para o seu negócio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ERPProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </ERPProvider>
      </body>
    </html>
  );
}
