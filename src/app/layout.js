import { Geist, Geist_Mono } from "next/font/google";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";


export const metadata = {
  title: "Asisten Guru Cerdas",
  description: "by Netila @Ronie_Ri.2025",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
