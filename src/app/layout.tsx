import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Corporación Oropeza's | Sistema de Gestión Retail",
  description: "Sistema de gestión integral para bodegas y ferreterías. Control de inventario, ventas, clientes y reportes en tiempo real.",
  keywords: ["gestión", "retail", "inventario", "ventas", "ferretería", "bodega", "POS"],
  authors: [{ name: "Corporación Oropeza's E.I.R.L." }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
