"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Role = "KOORDINATOR" | "OGRENCI" | "BOLUM_BASKANI";

interface SessionUser {
  id: number;
  email: string;
  roles: Role[];
}

interface Student {
  id: number;
  studentNumber: string;
  fullName: string;
  email: string;
  program: string;
  admissionTerm: string;
  status: string;
}

interface CatalogCourse {
  id: number;
  code: string;
  name: string;
  ects: number;
  credits: number | null;
  active: boolean;
}

interface CourseRecord {
  id: number;
  courseId: number;
  code: string;
  name: string;
  ects: number;
  academicYear: string;
  term: string;
  status: string;
  reviewStatus: string;
  grade: string | null;
  attempt: number;
  reason: string | null;
  isHistoricalEntry: boolean;
}

interface AuditEntry {
  id: number;
  userId: number | null;
  action: string;
  recordType: string;
  recordId: string;
  reason: string | null;
  timestamp: string;
}

interface Message {
  id: number;
  senderUserId: number;
  content: string;
  sentAt: string;
  isFromCurrentUser: boolean;
  readByStudent: boolean;
  readByCoordinator: boolean;
}

const API_BASE = "";

async function readMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return response.ok ? "" : `İstek başarısız (HTTP ${response.status}).`;
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    return text;
  }
  return response.ok ? "" : `İstek başarısız (HTTP ${response.status}).`;
}

export default function AcademicPortal() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [catalog, setCatalog] = useState<CatalogCourse[]>([]);
  const [records, setRecords] = useState<CourseRecord[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ruleResult, setRuleResult] = useState<Array<{ metric: string; actual: number | null; operator: string; threshold: number; passed: boolean; warning: string | null; unavailable: string | null }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [studentForm, setStudentForm] = useState({
    studentNumber: "", firstName: "", lastName: "", email: "", majorDepartment: "",
    program: "CAP", admissionTerm: "", temporaryPassword: ""
  });
  const [chairForm, setChairForm] = useState({ email: "", temporaryPassword: "" });
  const [courseForm, setCourseForm] = useState({
    courseId: "", academicYear: "", term: "Güz", status: "Planlandı", grade: "",
    attempt: "1", reason: "", historicalEntry: false
  });
  const [messageText, setMessageText] = useState("");
  const [advisingForm, setAdvisingForm] = useState({ majorGpa: "", gpaSource: "", privateNote: "", reason: "" });
  const [decisionForm, setDecisionForm] = useState({ decision: "Mezun", reason: "" });
  const [catalogForm, setCatalogForm] = useState({ code: "", name: "", ects: "5", credits: "", curriculumYear: "" });
  const [ruleForm, setRuleForm] = useState({ program: "CAP", metric: "AnadalGano", operator: "Minimum", threshold: "", warning: "", authority: "", effectiveAt: "" });

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (init.method && init.method !== "GET") {
      const csrfResponse = await fetch(`${API_BASE}/api/auth/csrf`, { credentials: "include" });
      if (!csrfResponse.ok) throw new Error(await readMessage(csrfResponse));
      const csrfBody = await csrfResponse.json() as { token: string };
      headers.set("X-CSRF-TOKEN", csrfBody.token);
    }
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "include"
    });
    if (!response.ok) throw new Error(await readMessage(response));
    return response;
  }, []);

  const refreshRecords = useCallback(async (studentId: number) => {
    const response = await request(`/api/academic/students/${studentId}/courses`);
    const body = await response.json() as { records: CourseRecord[] };
    setRecords(body.records);
  }, [request]);

  const refreshMessages = useCallback(async (studentId: number) => {
    const response = await request(`/api/academic/students/${studentId}/messages`);
    setMessages(await response.json() as Message[]);
  }, [request]);

  const loadDashboard = useCallback(async (activeUser: SessionUser) => {
    setError("");
    const catalogResponse = await request("/api/academic/catalog");
    setCatalog(await catalogResponse.json() as CatalogCourse[]);

    if (activeUser.roles.includes("OGRENCI")) {
      const response = await request("/api/academic/me/student");
      const profile = await response.json() as Student;
      setStudent(profile);
      setSelectedStudentId(profile.id);
      await refreshRecords(profile.id);
      return;
    }

    const studentResponse = await request("/api/academic/students");
    const studentList = await studentResponse.json() as Student[];
    setStudents(studentList);
    const selectedId = studentList[0]?.id ?? null;
    setSelectedStudentId(selectedId);
    if (selectedId !== null) await refreshRecords(selectedId);
    if (activeUser.roles.includes("BOLUM_BASKANI")) {
      const auditResponse = await request("/api/academic/audit");
      setAudit(await auditResponse.json() as AuditEntry[]);
    }
  }, [refreshRecords, request]);

  useEffect(() => {
    if (selectedStudentId === null || !user || user.roles.includes("BOLUM_BASKANI")) return;
    // The request synchronizes the selected student's inbox with the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshMessages(selectedStudentId).catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : "Mesajlar yüklenemedi.");
    });
  }, [refreshMessages, selectedStudentId, user]);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        if (!response.ok) return;
        const activeUser = await response.json() as SessionUser;
        if (cancelled) return;
        setUser(activeUser);
        await loadDashboard(activeUser);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Veriler yüklenemedi.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, [loadDashboard]);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const activeUser = await response.json() as SessionUser;
      setUser(activeUser);
      setLoginPassword("");
      await loadDashboard(activeUser);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Giriş yapılamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const setupCoordinator = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await request("/api/auth/setup", {
        method: "POST",
        headers: { "X-Setup-Key": setupKey },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      setNotice(await readMessage(response) || "İlk koordinatör hesabı oluşturuldu. Şimdi giriş yapabilirsiniz.");
      setShowSetup(false);
      setLoginPassword("");
      setSetupKey("");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Kurulum yapılamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
      setUser(null);
      setStudent(null);
      setStudents([]);
      setRecords([]);
      setAudit([]);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Oturum kapatılamadı.");
    }
  };

  const createStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await request("/api/academic/students", { method: "POST", body: JSON.stringify(studentForm) });
      setStudentForm({
        studentNumber: "", firstName: "", lastName: "", email: "", majorDepartment: "",
        program: "CAP", admissionTerm: "", temporaryPassword: ""
      });
      setNotice("Öğrenci kaydı ve hesabı oluşturuldu.");
      if (user) await loadDashboard(user);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Öğrenci eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const createChairAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await request("/api/academic/accounts", {
        method: "POST",
        body: JSON.stringify({ ...chairForm, role: "BOLUM_BASKANI" })
      });
      setChairForm({ email: "", temporaryPassword: "" });
      setNotice("Salt okunur bölüm başkanı hesabı oluşturuldu.");
    } catch (accountError) {
      setError(accountError instanceof Error ? accountError.message : "Hesap oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const addCourseRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedStudentId === null) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/academic/students/${selectedStudentId}/courses`, {
        method: "POST",
        body: JSON.stringify({
          ...courseForm,
          courseId: Number(courseForm.courseId),
          attempt: Number(courseForm.attempt),
          grade: courseForm.grade || null,
          reason: courseForm.reason || null,
          recordType: courseForm.status === "Planlandı" ? "Plan" : "Dönem Kaydı"
        })
      });
      setNotice(user?.roles.includes("KOORDINATOR") || courseForm.historicalEntry
        ? "Ders kaydı eklendi."
        : "Ders kaydı koordinatör onayına gönderildi.");
      await refreshRecords(selectedStudentId);
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Ders kaydı eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewRecord = async (recordId: number, status: string) => {
    const reason = status === "Onaylandı" ? null : window.prompt(`${status} gerekçesi`);
    if (status !== "Onaylandı" && !reason?.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await request(`/api/academic/courses/${recordId}/review`, {
        method: "POST",
        body: JSON.stringify({ status, reason })
      });
      if (selectedStudentId !== null) await refreshRecords(selectedStudentId);
      setNotice(`Kayıt ${status.toLocaleLowerCase("tr-TR")}.`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Kayıt incelenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedStudentId === null) return;
    setSubmitting(true);
    setError("");
    try {
      await request(`/api/academic/students/${selectedStudentId}/messages`, {
        method: "POST", body: JSON.stringify({ content: messageText })
      });
      setMessageText("");
      await refreshMessages(selectedStudentId);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Mesaj gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const markMessageRead = async (messageId: number) => {
    try {
      await request(`/api/academic/messages/${messageId}/read`, { method: "POST" });
      if (selectedStudentId !== null) await refreshMessages(selectedStudentId);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Mesaj okundu olarak işaretlenemedi.");
    }
  };

  const saveAdvisingData = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedStudentId === null) return;
    setSubmitting(true);
    setError("");
    try {
      await request(`/api/academic/students/${selectedStudentId}/advising-data`, {
        method: "PUT",
        body: JSON.stringify({
          majorGpa: advisingForm.majorGpa ? Number(advisingForm.majorGpa) : null,
          gpaSource: advisingForm.gpaSource || null,
          privateNote: advisingForm.privateNote || null,
          reason: advisingForm.reason || null
        })
      });
      setNotice("Koordinatör notu ve GANO bilgisi kaydedildi.");
      setAdvisingForm({ majorGpa: "", gpaSource: "", privateNote: "", reason: "" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Öğrenci bilgisi kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveDecision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedStudentId === null) return;
    setSubmitting(true);
    setError("");
    try {
      await request(`/api/academic/students/${selectedStudentId}/decision`, {
        method: "POST", body: JSON.stringify(decisionForm)
      });
      setNotice("Öğrenci kararı gerekçesiyle kaydedildi.");
      setDecisionForm({ ...decisionForm, reason: "" });
      if (user) await loadDashboard(user);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Karar kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const addCatalogCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await request("/api/academic/catalog", {
        method: "POST",
        body: JSON.stringify({
          code: catalogForm.code,
          name: catalogForm.name,
          ects: Number(catalogForm.ects),
          credits: catalogForm.credits ? Number(catalogForm.credits) : null,
          curriculumYear: catalogForm.curriculumYear ? Number(catalogForm.curriculumYear) : null
        })
      });
      setCatalogForm({ code: "", name: "", ects: "5", credits: "", curriculumYear: "" });
      const response = await request("/api/academic/catalog");
      setCatalog(await response.json() as CatalogCourse[]);
      setNotice("Ders kataloğa eklendi.");
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Ders eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const addRuleVersion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await request("/api/academic/rules", {
        method: "POST",
        body: JSON.stringify({
          program: ruleForm.program,
          authority: ruleForm.authority,
          effectiveAt: new Date(ruleForm.effectiveAt).toISOString(),
          rules: [{
            metric: ruleForm.metric,
            operator: ruleForm.operator,
            threshold: Number(ruleForm.threshold),
            warning: ruleForm.warning
          }]
        })
      });
      setNotice("Yönerge sürümü kaydedildi. Eski sürümler ve kontroller korunur.");
      setRuleForm({ ...ruleForm, authority: "", effectiveAt: "", threshold: "", warning: "" });
    } catch (ruleError) {
      setError(ruleError instanceof Error ? ruleError.message : "Yönerge sürümü kaydedilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const evaluateRules = async () => {
    if (selectedStudentId === null) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await request(`/api/academic/students/${selectedStudentId}/rules/evaluate`, { method: "POST" });
      const result = await response.json() as { rules: typeof ruleResult };
      setRuleResult(result.rules);
    } catch (ruleError) {
      setError(ruleError instanceof Error ? ruleError.message : "Kural denetimi yapılamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const isCoordinator = user?.roles.includes("KOORDINATOR") ?? false;
  const isStudent = user?.roles.includes("OGRENCI") ?? false;
  const isChair = user?.roles.includes("BOLUM_BASKANI") ?? false;

  if (busy) {
    return <main className="mx-auto max-w-5xl p-8 text-slate-600" role="status">Oturum kontrol ediliyor…</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-7">
            <p className="text-sm font-semibold text-blue-700">ÇAP · YDP</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Akademik takip sistemi</h1>
            <p className="mt-2 text-sm text-slate-600">Hesabınızla giriş yapın. Öğrenci kaydı yalnızca koordinatör tarafından açılır.</p>
          </div>
          {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
          {notice && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}
          <form className="space-y-4" onSubmit={showSetup ? setupCoordinator : signIn}>
            <label className="block text-sm font-medium text-slate-700">
              E-posta
              <input autoComplete="username" required type="email" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {showSetup ? "İlk koordinatör parolası" : "Parola"}
              <input autoComplete={showSetup ? "new-password" : "current-password"} required type="password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            {showSetup && (
              <label className="block text-sm font-medium text-slate-700">
                Kurulum anahtarı
                <input required type="password" value={setupKey} onChange={event => setSetupKey(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            )}
            <button disabled={submitting} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60">
              {submitting ? "İşleniyor…" : showSetup ? "Koordinatör hesabını oluştur" : "Giriş yap"}
            </button>
          </form>
          <button type="button" onClick={() => { setShowSetup(!showSetup); setError(""); }} className="mt-5 text-sm text-blue-700 underline">
            {showSetup ? "Giriş ekranına dön" : "İlk koordinatör kurulumu"}
          </button>
          <p className="mt-5 text-xs text-slate-500">Kurulum için backend üzerinde en az 32 karakterli COORDINATOR_SETUP_KEY tanımlanmalıdır.</p>
        </section>
      </main>
    );
  }

  const selectedStudent = isStudent ? student : students.find(item => item.id === selectedStudentId) ?? null;
  const pendingRecords = records.filter(record => record.reviewStatus === "Bekliyor");
  const completedEcts = Array.from(new Map(
    records
      .filter(record => record.reviewStatus === "Onaylandı" && (record.status === "Geçti" || record.status === "Muaf"))
      .map(record => [record.courseId, record.ects])
  ).values()).reduce((sum, ects) => sum + ects, 0);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="font-bold text-slate-900">ÇAP · YDP Akademik Takip</h1>
            <p className="text-sm text-slate-500">{user.email} · {isCoordinator ? "Koordinatör" : isChair ? "Bölüm başkanı (salt okunur)" : "Öğrenci"}</p>
          </div>
          <button onClick={signOut} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Güvenli çıkış</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}

        {isCoordinator && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Öğrenci ekle</h2>
            <form onSubmit={createStudent} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input required maxLength={20} placeholder="Öğrenci numarası" value={studentForm.studentNumber} onChange={event => setStudentForm({ ...studentForm, studentNumber: event.target.value })} className="rounded-lg border p-2" />
              <input required maxLength={50} placeholder="Ad" value={studentForm.firstName} onChange={event => setStudentForm({ ...studentForm, firstName: event.target.value })} className="rounded-lg border p-2" />
              <input required maxLength={50} placeholder="Soyad" value={studentForm.lastName} onChange={event => setStudentForm({ ...studentForm, lastName: event.target.value })} className="rounded-lg border p-2" />
              <input required type="email" placeholder="Okul e-postası" value={studentForm.email} onChange={event => setStudentForm({ ...studentForm, email: event.target.value })} className="rounded-lg border p-2" />
              <input required placeholder="Anadal bölümü" value={studentForm.majorDepartment} onChange={event => setStudentForm({ ...studentForm, majorDepartment: event.target.value })} className="rounded-lg border p-2" />
              <select value={studentForm.program} onChange={event => setStudentForm({ ...studentForm, program: event.target.value })} className="rounded-lg border p-2">
                <option value="CAP">ÇAP</option><option value="YDP">YDP</option>
              </select>
              <input required placeholder="Kabul dönemi" value={studentForm.admissionTerm} onChange={event => setStudentForm({ ...studentForm, admissionTerm: event.target.value })} className="rounded-lg border p-2" />
              <input required minLength={12} type="password" placeholder="Geçici parola (min. 12)" value={studentForm.temporaryPassword} onChange={event => setStudentForm({ ...studentForm, temporaryPassword: event.target.value })} className="rounded-lg border p-2" />
              <button disabled={submitting} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">Öğrenci hesabını aç</button>
            </form>
            <form onSubmit={createChairAccount} className="mt-5 flex flex-wrap items-end gap-3 border-t pt-4">
              <label className="text-sm">Bölüm başkanı e-postası
                <input required type="email" value={chairForm.email} onChange={event => setChairForm({ ...chairForm, email: event.target.value })} className="mt-1 block rounded-lg border p-2" />
              </label>
              <label className="text-sm">Geçici parola
                <input required minLength={12} type="password" value={chairForm.temporaryPassword} onChange={event => setChairForm({ ...chairForm, temporaryPassword: event.target.value })} className="mt-1 block rounded-lg border p-2" />
              </label>
              <button disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Salt okunur başkan hesabı aç</button>
            </form>
            <form onSubmit={addCatalogCourse} className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5">
              <h3 className="font-semibold sm:col-span-2 lg:col-span-5">Ders kataloğuna ders ekle</h3>
              <input required maxLength={20} placeholder="Ders kodu" value={catalogForm.code} onChange={event => setCatalogForm({ ...catalogForm, code: event.target.value })} className="rounded-lg border p-2" />
              <input required maxLength={100} placeholder="Ders adı" value={catalogForm.name} onChange={event => setCatalogForm({ ...catalogForm, name: event.target.value })} className="rounded-lg border p-2" />
              <input required type="number" min="1" max="60" placeholder="AKTS" value={catalogForm.ects} onChange={event => setCatalogForm({ ...catalogForm, ects: event.target.value })} className="rounded-lg border p-2" />
              <input type="number" min="0" max="30" placeholder="Kredi (isteğe bağlı)" value={catalogForm.credits} onChange={event => setCatalogForm({ ...catalogForm, credits: event.target.value })} className="rounded-lg border p-2" />
              <button disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Kataloğa ekle</button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Öğrenci ders ve ilerleme kaydı</h2>
              {selectedStudent && (
                <p className="mt-1 text-sm text-slate-600">{selectedStudent.fullName} · {selectedStudent.studentNumber} · {selectedStudent.program} · Kabul: {selectedStudent.admissionTerm}</p>
              )}
            </div>
            {!isStudent && (
              <select aria-label="Öğrenci seç" value={selectedStudentId ?? ""} onChange={async event => {
                const id = Number(event.target.value);
                setSelectedStudentId(id);
                setError("");
                try { await refreshRecords(id); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Dersler yüklenemedi."); }
              }} className="rounded-lg border p-2">
                {students.length === 0 && <option value="">Henüz öğrenci yok</option>}
                {students.map(item => <option key={item.id} value={item.id}>{item.studentNumber} · {item.fullName}</option>)}
              </select>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Onaylı tamamlanan AKTS: {completedEcts}</span>
                <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Onay bekleyen kayıt: {pendingRecords.length}</span>
              </div>

              {!isChair && (
                <form onSubmit={addCourseRecord} className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-sm">Katalog dersi
                    <select required value={courseForm.courseId} onChange={event => setCourseForm({ ...courseForm, courseId: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2">
                      <option value="">Ders seçin</option>
                      {catalog.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} ({item.ects} AKTS)</option>)}
                    </select>
                  </label>
                  <input required pattern="\d{4}-\d{4}" placeholder="Akademik yıl (2025-2026)" value={courseForm.academicYear} onChange={event => setCourseForm({ ...courseForm, academicYear: event.target.value })} className="self-end rounded-lg border p-2" />
                  <select value={courseForm.term} onChange={event => setCourseForm({ ...courseForm, term: event.target.value })} className="self-end rounded-lg border bg-white p-2">
                    <option>Güz</option><option>Bahar</option><option>Yaz</option>
                  </select>
                  <select value={courseForm.status} onChange={event => setCourseForm({ ...courseForm, status: event.target.value })} className="self-end rounded-lg border bg-white p-2">
                    <option>Planlandı</option><option>Alındı</option><option>Geçti</option><option>Kaldı</option><option>Muaf</option>
                  </select>
                  {(courseForm.status === "Geçti" || courseForm.status === "Kaldı") && <input required maxLength={5} placeholder="Not" value={courseForm.grade} onChange={event => setCourseForm({ ...courseForm, grade: event.target.value })} className="rounded-lg border p-2" />}
                  <input required type="number" min="1" max="20" placeholder="Deneme no" value={courseForm.attempt} onChange={event => setCourseForm({ ...courseForm, attempt: event.target.value })} className="rounded-lg border p-2" />
                  {(courseForm.status === "Muaf" || isCoordinator) && <input required={courseForm.status === "Muaf"} maxLength={1000} placeholder={courseForm.status === "Muaf" ? "Muafiyet gerekçesi" : "Değişiklik gerekçesi"} value={courseForm.reason} onChange={event => setCourseForm({ ...courseForm, reason: event.target.value })} className="rounded-lg border p-2" />}
                  {isCoordinator && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={courseForm.historicalEntry} onChange={event => setCourseForm({ ...courseForm, historicalEntry: event.target.checked })} />İlk kurulum geçmiş kaydı (hemen onayla)</label>}
                  <button disabled={submitting || catalog.length === 0} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
                    {isCoordinator ? "Ders kaydını ekle" : "Onaya gönder"}
                  </button>
                </form>
              )}

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-slate-500"><tr>
                    <th className="p-2">Ders</th><th className="p-2">Dönem</th><th className="p-2">Deneme</th><th className="p-2">Not</th><th className="p-2">Durum</th><th className="p-2">İnceleme</th>{isCoordinator && <th className="p-2">İşlem</th>}
                  </tr></thead>
                  <tbody className="divide-y">
                    {records.map(record => <tr key={record.id}>
                      <td className="p-2">{record.code} · {record.name}<span className="block text-xs text-slate-500">{record.ects} AKTS{record.isHistoricalEntry ? " · geçmiş kayıt" : ""}</span></td>
                      <td className="p-2">{record.academicYear} {record.term}</td>
                      <td className="p-2">{record.attempt}</td><td className="p-2">{record.grade ?? "—"}</td>
                      <td className="p-2">{record.status}</td><td className="p-2">{record.reviewStatus}{record.reason ? <span className="block text-xs text-slate-500">{record.reason}</span> : null}</td>
                      {isCoordinator && <td className="space-x-2 p-2">
                        {record.reviewStatus === "Bekliyor" && <>
                          <button disabled={submitting} onClick={() => void reviewRecord(record.id, "Onaylandı")} className="text-emerald-700 underline">Onayla</button>
                          <button disabled={submitting} onClick={() => void reviewRecord(record.id, "Reddedildi")} className="text-red-700 underline">Reddet</button>
                        </>}
                      </td>}
                    </tr>)}
                    {records.length === 0 && <tr><td colSpan={isCoordinator ? 7 : 6} className="p-5 text-center text-slate-500">Henüz ders kaydı yok.</td></tr>}
                  </tbody>
                </table>
              </div>

              {!isChair && (
                <section className="mt-6 border-t pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">Koordinatör–öğrenci yazışması</h3>
                    <button onClick={() => void refreshMessages(selectedStudent.id)} className="text-sm text-blue-700 underline">Mesajları yenile</button>
                  </div>
                  <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
                    {messages.map(message => <article key={message.id} className={`rounded-lg p-3 text-sm ${message.isFromCurrentUser ? "ml-8 bg-blue-50" : "mr-8 bg-slate-100"}`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <time>{new Date(message.sentAt).toLocaleString("tr-TR")}</time>
                        <span>{message.isFromCurrentUser ? "Siz gönderdiniz" : "Karşı taraf"} · {isStudent ? (message.readByCoordinator ? "Okundu" : "Okunmadı") : (message.readByStudent ? "Okundu" : "Okunmadı")}</span>
                        {!message.isFromCurrentUser && <button onClick={() => void markMessageRead(message.id)} className="text-blue-700 underline">Okundu</button>}
                      </div>
                    </article>)}
                    {messages.length === 0 && <p className="text-sm text-slate-500">Henüz mesaj yok.</p>}
                  </div>
                  <form onSubmit={sendMessage} className="mt-3 flex gap-2">
                    <textarea required maxLength={10000} value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Mesajınızı yazın" className="min-h-20 flex-1 rounded-lg border p-3" />
                    <button disabled={submitting} className="self-end rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Gönder</button>
                  </form>
                  <p className="mt-2 text-xs text-slate-500">Mesajlar kalıcıdır, silinemez. Belge eki bu sürümde devre dışıdır.</p>
                </section>
              )}

              {isCoordinator && (
                <div className="mt-6 grid gap-5 border-t pt-5 lg:grid-cols-2">
                  <form onSubmit={saveAdvisingData} className="space-y-3 rounded-lg bg-slate-50 p-4">
                    <h3 className="font-semibold">GANO ve koordinatör özel notu</h3>
                    <input type="number" min="0" max="4" step="0.01" placeholder="Anadal GANO" value={advisingForm.majorGpa} onChange={event => setAdvisingForm({ ...advisingForm, majorGpa: event.target.value })} className="w-full rounded-lg border p-2" />
                    <input maxLength={100} placeholder="GANO kaynağı (transkript vb.)" value={advisingForm.gpaSource} onChange={event => setAdvisingForm({ ...advisingForm, gpaSource: event.target.value })} className="w-full rounded-lg border p-2" />
                    <textarea maxLength={5000} placeholder="Bu not öğrenciye gösterilmez" value={advisingForm.privateNote} onChange={event => setAdvisingForm({ ...advisingForm, privateNote: event.target.value })} className="min-h-20 w-full rounded-lg border p-2" />
                    <input maxLength={1000} placeholder="Değişiklik gerekçesi" value={advisingForm.reason} onChange={event => setAdvisingForm({ ...advisingForm, reason: event.target.value })} className="w-full rounded-lg border p-2" />
                    <button disabled={submitting} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Bilgileri kaydet</button>
                  </form>
                  <div className="space-y-4 rounded-lg bg-slate-50 p-4">
                    <form onSubmit={addRuleVersion} className="space-y-3">
                      <h3 className="font-semibold">Yönerge kural sürümü</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select value={ruleForm.program} onChange={event => setRuleForm({ ...ruleForm, program: event.target.value })} className="rounded-lg border bg-white p-2"><option value="CAP">ÇAP</option><option value="YDP">YDP</option></select>
                        <select value={ruleForm.metric} onChange={event => setRuleForm({ ...ruleForm, metric: event.target.value })} className="rounded-lg border bg-white p-2"><option value="AnadalGano">Anadal GANO</option><option value="TamamlananAkts">Onaylı tamamlanan AKTS</option></select>
                        <select value={ruleForm.operator} onChange={event => setRuleForm({ ...ruleForm, operator: event.target.value })} className="rounded-lg border bg-white p-2"><option value="Minimum">En az</option><option value="Maksimum">En fazla</option></select>
                        <input required type="number" min="0" step="0.01" placeholder="Yönergedeki eşik" value={ruleForm.threshold} onChange={event => setRuleForm({ ...ruleForm, threshold: event.target.value })} className="rounded-lg border p-2" />
                        <input required placeholder="Yönerge dayanağı / sürüm açıklaması" value={ruleForm.authority} onChange={event => setRuleForm({ ...ruleForm, authority: event.target.value })} className="rounded-lg border p-2 sm:col-span-2" />
                        <input required type="date" value={ruleForm.effectiveAt} onChange={event => setRuleForm({ ...ruleForm, effectiveAt: event.target.value })} className="rounded-lg border p-2" />
                        <input required placeholder="Uyarı metni" value={ruleForm.warning} onChange={event => setRuleForm({ ...ruleForm, warning: event.target.value })} className="rounded-lg border p-2" />
                      </div>
                      <button disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Yeni sürüm kaydet</button>
                    </form>
                    <div className="border-t pt-3">
                      <button disabled={submitting} onClick={() => void evaluateRules()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Yönergeye göre kontrol et</button>
                      {ruleResult.map((result, index) => <p key={`${result.metric}-${index}`} className="mt-2 text-sm">
                        {result.metric}: {result.actual ?? "Veri yok"} · eşik {result.operator === "Minimum" ? "≥" : "≤"} {result.threshold} · {result.passed ? "Uygun" : result.warning ?? result.unavailable}
                      </p>)}
                    </div>
                  </div>
                  <form onSubmit={saveDecision} className="flex flex-wrap items-end gap-3 rounded-lg bg-slate-50 p-4 lg:col-span-2">
                    <h3 className="w-full font-semibold">Koordinatör kararı</h3>
                    <select value={decisionForm.decision} onChange={event => setDecisionForm({ ...decisionForm, decision: event.target.value })} className="rounded-lg border bg-white p-2">
                      <option value="Mezun">Mezun</option><option value="SertifikaVerildi">Sertifika verildi</option><option value="KayitIptal">Kayıt iptali</option><option value="Aktif">Aktif</option>
                    </select>
                    <input required maxLength={1000} placeholder="Karar gerekçesi" value={decisionForm.reason} onChange={event => setDecisionForm({ ...decisionForm, reason: event.target.value })} className="min-w-64 flex-1 rounded-lg border p-2" />
                    <button disabled={submitting} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Kararı kaydet</button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>

        {isChair && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">İşlem geçmişi · salt okunur</h2>
            <div className="mt-3 space-y-2">
              {audit.map(item => <article key={item.id} className="border-b py-2 text-sm">
                <strong>{item.action}</strong> · {item.recordType} #{item.recordId} · {new Date(item.timestamp).toLocaleString("tr-TR")}
                {item.reason && <p className="text-slate-600">Gerekçe: {item.reason}</p>}
              </article>)}
              {audit.length === 0 && <p className="text-sm text-slate-500">Henüz işlem kaydı yok.</p>}
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500">Bu sürümde öğrenci ve ders kayıtları kalıcıdır. Belge yükleme, mesajlaşma, sürümlü yönerge kuralları ve mezuniyet karar akışları henüz tamamlanmadı; güvenlik testi yapılmış gibi gösterilmez.</p>
      </div>
    </main>
  );
}
