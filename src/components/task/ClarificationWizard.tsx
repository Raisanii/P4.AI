// P4.AI — ClarificationWizard (TASK-02, §7.6, NFR-09).
// Client component: sequential step wizard for creating a task with AI.
//
// Flow: title → AI generates 3-5 questions → secretary answers → preview KB → submit.
// NFR-09: show loading state while AI generates questions (<10s target).
//
// AI proposes, backend decides: the /api/task/clarify/answers endpoint compiles
// the knowledge base server-side and creates the Assignment. The wizard never
// trusts AI output directly — it passes draft + answers to the backend.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "draft" | "questions" | "answers" | "preview";

type Draft = {
  title: string;
  subject: string;
  description: string;
};

type QnA = {
  question: string;
  answer: string;
};

export default function ClarificationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  // Questions from AI
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Answers
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Preview
  const [previewTask, setPreviewTask] = useState<Record<string, unknown> | null>(null);

  // --- Step 1: submit draft → get AI questions ---
  async function handleGetQuestions(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setLoadingQuestions(true);

    const res = await fetch("/api/task/clarify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subject, description }),
    });

    setLoadingQuestions(false);
    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Gagal menghasilkan pertanyaan");
      return;
    }

    const data = await res.json() as { questions: string[] };
    setQuestions(data.questions);
    setAnswers({});
    setStep("questions");
  }

  // --- Step 2: review questions → go to answers ---
  function proceedToAnswers() {
    setStep("answers");
  }

  // --- Step 3: submit answers → compile KB + create task ---
  async function handleSubmitAnswers(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Build Q&A pairs — require all answers.
    const qna: QnA[] = questions.map((q, i) => ({
      question: q,
      answer: (answers[i] ?? "").trim(),
    }));

    const missing = qna.some((c) => c.answer.length === 0);
    if (missing) {
      setError("Semua pertanyaan harus dijawab.");
      setSaving(false);
      return;
    }

    const draft: Draft = { title, subject, description };

    const res = await fetch("/api/task/clarify/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, clarifications: qna }),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Gagal membuat tugas");
      return;
    }

    const task = await res.json() as Record<string, unknown>;
    setPreviewTask(task);
    setStep("preview");
  }

  // --- Finish ---
  function finish() {
    router.push("/tugas");
    router.refresh();
  }

  function startOver() {
    setStep("draft");
    setQuestions([]);
    setAnswers({});
    setPreviewTask(null);
    setError(null);
  }

  // --- Render ---

  if (step === "draft") {
    return (
      <form onSubmit={handleGetQuestions} className="inline-form" noValidate>
        <h2 className="wizard-step-title">Langkah 1: Draft Tugas</h2>
        <p className="wizard-step-desc">
          Masukkan judul dan deskripsi singkat. AI akan menghasilkan pertanyaan klarifikasi.
        </p>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="form-grid">
          <div className="form-field form-field-wide">
            <label htmlFor="w-title">Judul Tugas</label>
            <input
              id="w-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={saving}
              placeholder="Tugas Matematika Bab 4"
            />
          </div>
          <div className="form-field">
            <label htmlFor="w-subject">Mapel</label>
            <input
              id="w-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={saving}
              placeholder="Matematika"
            />
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="w-desc">Deskripsi</label>
            <textarea
              id="w-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              rows={3}
              placeholder="Deskripsi singkat tugas..."
            />
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {loadingQuestions ? "AI sedang berpikir..." : "Generate Pertanyaan"}
          </button>
        </div>
        {loadingQuestions && (
          <div className="wizard-loading" role="status">
            <span className="spinner" aria-hidden="true" />
            AI sedang menyusun pertanyaan klarifikasi...
          </div>
        )}
      </form>
    );
  }

  if (step === "questions") {
    return (
      <div className="inline-form">
        <h2 className="wizard-step-title">Langkah 2: Pertanyaan AI</h2>
        <p className="wizard-step-desc">
          AI menghasilkan {questions.length} pertanyaan. Tinjau sebelum menjawab.
        </p>
        {error && <div className="alert" role="alert">{error}</div>}
        <ol className="wizard-question-preview">
          {questions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ol>
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" onClick={proceedToAnswers}>
            Lanjut ke Jawaban
          </button>
          <button className="btn btn-ghost btn-sm" onClick={startOver}>
            Ulang
          </button>
        </div>
      </div>
    );
  }

  if (step === "answers") {
    return (
      <form onSubmit={handleSubmitAnswers} className="inline-form" noValidate>
        <h2 className="wizard-step-title">Langkah 3: Jawab Pertanyaan</h2>
        <p className="wizard-step-desc">
          Jawab semua pertanyaan. Jawaban akan disusun menjadi knowledge base tugas.
        </p>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="wizard-answers">
          {questions.map((q, i) => (
            <div key={i} className="form-field form-field-wide">
              <label htmlFor={`a-${i}`}>{q}</label>
              <input
                id={`a-${i}`}
                type="text"
                value={answers[i] ?? ""}
                onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                disabled={saving}
                required
              />
            </div>
          ))}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? "Menyusun..." : "Susun & Buat Tugas"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep("questions")}>
            Kembali
          </button>
        </div>
      </form>
    );
  }

  // preview
  const kb = (previewTask?.knowledgeBase ?? previewTask) as Record<string, unknown>;
  return (
    <div className="inline-form">
      <h2 className="wizard-step-title">Langkah 4: Konfirmasi</h2>
      <p className="wizard-step-desc">Tugas berhasil dibuat. Berikut knowledge base yang tersusun:</p>
      <dl className="wizard-preview">
        {Object.entries(kb).map(([k, v]) => (
          <div key={k} className="wizard-preview-row">
            <dt>{k}</dt>
            <dd>{v === null ? "—" : String(v)}</dd>
          </div>
        ))}
      </dl>
      <div className="form-actions">
        <button className="btn btn-primary btn-sm" onClick={finish}>
          Selesai
        </button>
      </div>
    </div>
  );
}
