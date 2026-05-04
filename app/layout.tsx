import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AGENDAPRO - TEACOLHE",
  description: "SISTEMA DE CADASTRO E GESTÃO DE PACIENTES TEACOLHE",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} antialiased uppercase`}
      suppressHydrationWarning
    >
      <body className="h-screen overflow-hidden uppercase">{children}</body>
    </html>
  );
}
