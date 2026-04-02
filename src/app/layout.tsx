import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "HSE Core",
  description: "Avalie, gerencie e reporte riscos psicossociais com precisão.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${dmSans.variable} min-h-screen bg-background font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
