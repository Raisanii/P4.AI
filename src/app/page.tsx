import { auth } from "@/lib/auth";
import Header from "@/components/layout/Header";

export default async function Home() {
  const session = await auth();

  return (
    <>
      <Header />
      <main className="page">
        <h1>P4.AI — Classroom OS</h1>
        <p>
          AI-powered Classroom Operating System for SMK class. Single source
          of truth for schedule, tasks, attendance, announcements, and
          WhatsApp AI assistant.
        </p>
        {session?.user && (
          <p style={{ marginTop: "1rem", color: "var(--text-muted)" }}>
            Selamat datang, {session.user.name}.
          </p>
        )}
      </main>
    </>
  );
}
