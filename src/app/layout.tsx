import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "P4.AI — Classroom OS",
  description:
    "AI-powered Classroom Operating System for SMK class. Single source of truth for schedule, tasks, attendance, announcements, and WhatsApp AI assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
