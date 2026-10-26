"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  Landmark,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

type Role = "KOORDINATOR" | "OGRENCI" | "BOLUM_BASKANI";
type PortalView = "overview" | "students" | "courses" | "documents" | "messages" | "rules" | "audit";

function defaultViewForRole(roles: Role[]): PortalView {
  if (roles.includes("KOORDINATOR")) return "students";
  if (roles.includes("OGRENCI")) return "courses";
  return "audit";
}

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
  curriculumYear?: number | null;
  courseType?: string | null;
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

interface StudentDocument {
  id: number;
  studentId: number;
  studentNumber: string;
  studentName: string;
  documentType: string;
  academicYear: string | null;
  term: string | null;
  fileName: string;
  sizeBytes: number;
  status: string;
  reviewReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
  hasFile: boolean;
}

const DOCUMENT_TYPES = [
  { value: "DonemSonuTranskript", label: "Dönem sonu transkripti" },
  { value: "CapIntibakDilekcesi", label: "ÇAP / YDP intibak dilekçesi" },
  { value: "StajMuafiyetFormu", label: "Staj / muafiyet formu" },
  { value: "DigerResmiEvrak", label: "Diğer resmi evrak" },
];

const DEMO_STUDENTS: Student[] = [
  {
    id: 101,
    studentNumber: "202210001",
    fullName: "Deniz Örnek",
    email: "deniz.ornek@example.invalid",
    program: "CAP",
    admissionTerm: "2024-2025 Güz",
    status: "Aktif",
  },
  {
    id: 102,
    studentNumber: "202210002",
    fullName: "Ece Deneme",
    email: "ece.deneme@example.invalid",
    program: "YDP",
    admissionTerm: "2024-2025 Bahar",
    status: "Aktif",
  },
];

const DEMO_CATALOG: CatalogCourse[] = [
  { id: 201, code: "YBS301", name: "Veri Tabanı Yönetimi", ects: 6, credits: 4, active: true },
  { id: 202, code: "YBS302", name: "Sistem Analizi", ects: 5, credits: 3, active: true },
  { id: 203, code: "ISL205", name: "İşletme Yönetimi", ects: 5, credits: 3, active: true },
];

const DEMO_RECORDS: CourseRecord[] = [
  {
    id: 301,
    courseId: 201,
    code: "YBS301",
    name: "Veri Tabanı Yönetimi",
    ects: 6,
    academicYear: "2025-2026",
    term: "Güz",
    status: "Geçti",
    reviewStatus: "Onaylandı",
    grade: "AA",
    attempt: 1,
    reason: null,
    isHistoricalEntry: false,
  },
  {
    id: 302,
    courseId: 202,
    code: "YBS302",
    name: "Sistem Analizi",
    ects: 5,
    academicYear: "2026-2027",
    term: "Güz",
    status: "Planlandı",
    reviewStatus: "Bekliyor",
    grade: null,
    attempt: 1,
    reason: null,
    isHistoricalEntry: false,
  },
];

const DEMO_MESSAGES: Message[] = [
  {
    id: 401,
    senderUserId: -1,
    content: "Merhaba, güz dönemi ders planınızı inceledim. Sistem Analizi dersiniz onay bekliyor.",
    sentAt: "2026-10-20T09:30:00Z",
    isFromCurrentUser: false,
    readByStudent: false,
    readByCoordinator: true,
  },
];

const DEMO_AUDIT: AuditEntry[] = [
  {
    id: 501,
    userId: -1,
    action: "Ders kaydı onaylandı",
    recordType: "CourseRecord",
    recordId: "301",
    reason: "Örnek işlem kaydı",
    timestamp: "2026-10-18T13:45:00Z",
  },
  {
    id: 502,
    userId: -1,
    action: "Öğrenci kaydı oluşturuldu",
    recordType: "Student",
    recordId: "101",
    reason: "Örnek işlem kaydı",
    timestamp: "2026-09-15T08:00:00Z",
  },
];

const DEMO_DOCUMENTS: StudentDocument[] = [
  {
    id: 601,
    studentId: DEMO_STUDENTS[0].id,
    studentNumber: DEMO_STUDENTS[0].studentNumber,
    studentName: DEMO_STUDENTS[0].fullName,
    documentType: "DonemSonuTranskript",
    academicYear: "2025-2026",
    term: "Güz",
    fileName: "2025-2026_Guz_Transkript.pdf",
    sizeBytes: 1240000,
    status: "Onaylandı",
    reviewReason: null,
    uploadedAt: "2026-10-18T10:30:00Z",
    reviewedAt: "2026-10-19T08:00:00Z",
    hasFile: false,
  },
  {
    id: 602,
    studentId: DEMO_STUDENTS[0].id,
    studentNumber: DEMO_STUDENTS[0].studentNumber,
    studentName: DEMO_STUDENTS[0].fullName,
    documentType: "CapIntibakDilekcesi",
    academicYear: "2025-2026",
    term: "Güz",
    fileName: "Intibak_Dilekcesi.pdf",
    sizeBytes: 860000,
    status: "YenidenYukleme",
    reviewReason: "İmzalı ve güncel tarihli nüshayı tekrar yükleyiniz.",
    uploadedAt: "2026-10-20T11:15:00Z",
    reviewedAt: "2026-10-21T09:00:00Z",
    hasFile: false,
  },
];

const API_BASE = "";
const isDemoAvailable = process.env.NODE_ENV === "development";

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
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [documentUploadForm, setDocumentUploadForm] = useState({ documentType: DOCUMENT_TYPES[0].value, academicYear: "", term: "Güz" });
  const [documentRequestForm, setDocumentRequestForm] = useState({ studentId: "", documentType: DOCUMENT_TYPES[0].value, academicYear: "", term: "Güz", reason: "" });
  const [documentStudentFilter, setDocumentStudentFilter] = useState("");
  const [ruleResult, setRuleResult] = useState<Array<{ metric: string; actual: number | null; operator: string; threshold: number; passed: boolean; warning: string | null; unavailable: string | null }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<PortalView>("overview");
  const [busy, setBusy] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
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
  const [editingCatalogCourseId, setEditingCatalogCourseId] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState({ program: "CAP", metric: "AnadalGano", operator: "Minimum", threshold: "", warning: "", authority: "", effectiveAt: "" });

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (demoMode) {
      throw new Error("Demo modunda işlemler kapalı; backend'e istek gönderilmedi.");
    }
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
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
  }, [demoMode]);

  const refreshRecords = useCallback(async (studentId: number) => {
    if (demoMode) {
      setRecords(studentId === DEMO_STUDENTS[0].id ? DEMO_RECORDS : []);
      return;
    }
    const response = await request(`/api/academic/students/${studentId}/courses`);
    const body = await response.json() as { records: CourseRecord[] };
    setRecords(body.records);
  }, [demoMode, request]);

  const refreshDocuments = useCallback(async (filterStudentId?: number) => {
    if (demoMode) {
      setDocuments(filterStudentId
        ? DEMO_DOCUMENTS.filter(document => document.studentId === filterStudentId)
        : DEMO_DOCUMENTS);
      return;
    }
    const query = filterStudentId ? `?studentId=${filterStudentId}` : "";
    const response = await request(`/api/academic/documents${query}`);
    setDocuments(await response.json() as StudentDocument[]);
  }, [demoMode, request]);

  const refreshAdvisingData = useCallback(async (studentId: number) => {
    if (demoMode) {
      setAdvisingForm({ majorGpa: "", gpaSource: "", privateNote: "", reason: "" });
      return;
    }
    const response = await request(`/api/academic/students/${studentId}/advising-data`);
    const data = await response.json() as { majorGpa: number | null; gpaSource: string | null; privateNote: string | null };
    setAdvisingForm({
      majorGpa: data.majorGpa === null ? "" : String(data.majorGpa),
      gpaSource: data.gpaSource ?? "",
      privateNote: data.privateNote ?? "",
      reason: ""
    });
  }, [demoMode, request]);

  const refreshMessages = useCallback(async (studentId: number) => {
    if (demoMode) {
      setMessages(studentId === DEMO_STUDENTS[0].id ? DEMO_MESSAGES : []);
      return;
    }
    const response = await request(`/api/academic/students/${studentId}/messages`);
    setMessages(await response.json() as Message[]);
  }, [demoMode, request]);

  const loadDashboard = useCallback(async (activeUser: SessionUser, useDemoData = false) => {
    setError("");
    if (useDemoData) {
      const demoStudent = DEMO_STUDENTS[0];
      setCatalog(DEMO_CATALOG);
      setStudent(activeUser.roles.includes("OGRENCI") ? demoStudent : null);
      setStudents(DEMO_STUDENTS);
      setSelectedStudentId(demoStudent.id);
      setRecords(DEMO_RECORDS);
      setMessages(DEMO_MESSAGES.map(message => ({
        ...message,
        isFromCurrentUser: activeUser.roles.includes("KOORDINATOR"),
      })));
      setAudit(DEMO_AUDIT);
      setDocuments(DEMO_DOCUMENTS.filter(document => activeUser.roles.includes("OGRENCI")
        ? document.studentId === demoStudent.id
        : true));
      setRuleResult([]);
      return;
    }

    const catalogResponse = await request(`/api/academic/catalog${activeUser.roles.includes("KOORDINATOR") ? "?includeInactive=true" : ""}`);
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
    if (activeUser.roles.includes("BOLUM_BASKANI") || activeUser.roles.includes("KOORDINATOR")) {
      const auditResponse = await request("/api/academic/audit");
      setAudit(await auditResponse.json() as AuditEntry[]);
    }
  }, [refreshRecords, request]);

  const enterDemo = (role: Role) => {
    const demoUsers: Record<Role, SessionUser> = {
      KOORDINATOR: { id: -1, email: "koordinator.demo@example.invalid", roles: ["KOORDINATOR"] },
      OGRENCI: { id: -2, email: DEMO_STUDENTS[0].email, roles: ["OGRENCI"] },
      BOLUM_BASKANI: { id: -3, email: "baskan.demo@example.invalid", roles: ["BOLUM_BASKANI"] },
    };
    const demoUser = demoUsers[role];
    setDemoMode(true);
    setUser(demoUser);
    setActiveView(defaultViewForRole(demoUser.roles));
    void loadDashboard(demoUser, true);
  };

  useEffect(() => {
    if (demoMode || selectedStudentId === null || !user || user.roles.includes("BOLUM_BASKANI")) return;
    // The request synchronizes the selected student's inbox with the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshMessages(selectedStudentId).catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : "Mesajlar yüklenemedi.");
    });
  }, [demoMode, refreshMessages, selectedStudentId, user]);

  useEffect(() => {
    if (activeView !== "documents" || !user) return;
    const filterStudentId = user.roles.includes("OGRENCI")
      ? selectedStudentId ?? undefined
      : documentStudentFilter
        ? Number(documentStudentFilter)
        : undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshDocuments(filterStudentId).catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : "Belgeler yüklenemedi.");
    });
  }, [activeView, documentStudentFilter, refreshDocuments, selectedStudentId, user]);

  useEffect(() => {
    if (demoMode) return;

    let cancelled = false;
    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        if (!response.ok) return;
        const activeUser = await response.json() as SessionUser;
        if (cancelled) return;
        setUser(activeUser);
        setActiveView(defaultViewForRole(activeUser.roles));
        await loadDashboard(activeUser);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Veriler yüklenemedi.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    };
    void restoreSession();
    return () => { cancelled = true; };
  }, [demoMode, loadDashboard]);

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
      setActiveView(defaultViewForRole(activeUser.roles));
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
    if (demoMode) {
      setDemoMode(false);
      setUser(null);
      setStudent(null);
      setStudents([]);
      setCatalog([]);
      setRecords([]);
      setMessages([]);
      setDocuments([]);
      setAudit([]);
      setSelectedStudentId(null);
      setActiveView("overview");
      setError("");
      return;
    }

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

  const uploadDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!student || !selectedDocumentFile) return;
    if (demoMode) {
      setNotice("Demo modunda dosyalar yüklenmez veya saklanmaz.");
      return;
    }
    if (selectedDocumentFile.type !== "application/pdf" && !selectedDocumentFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Yalnızca PDF dosyası yükleyebilirsiniz.");
      return;
    }
    if (selectedDocumentFile.size > 25 * 1024 * 1024) {
      setError("Dosya boyutu 25 MB sınırını aşamaz.");
      return;
    }

    const formData = new FormData();
    formData.set("file", selectedDocumentFile);
    formData.set("documentType", documentUploadForm.documentType);
    if (documentUploadForm.academicYear) {
      formData.set("academicYear", documentUploadForm.academicYear);
      formData.set("term", documentUploadForm.term);
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/academic/students/${student.id}/documents`, { method: "POST", body: formData });
      setSelectedDocumentFile(null);
      setNotice("Belge güvenlik taramasından geçti ve koordinatör incelemesine gönderildi.");
      await refreshDocuments(student.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Belge yüklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestStudentDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentRequestForm.studentId) {
      setError("Belge istenecek öğrenciyi seçin.");
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/academic/students/${documentRequestForm.studentId}/documents/request`, {
        method: "POST",
        body: JSON.stringify({
          documentType: documentRequestForm.documentType,
          academicYear: documentRequestForm.academicYear || null,
          term: documentRequestForm.academicYear ? documentRequestForm.term : null,
          reason: documentRequestForm.reason
        })
      });
      setDocumentRequestForm({ ...documentRequestForm, reason: "" });
      setNotice("Yeni belge talebi öğrenci hesabına iletildi.");
      const requestedStudentId = Number(documentRequestForm.studentId);
      setDocumentStudentFilter(String(requestedStudentId));
      await refreshDocuments(requestedStudentId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Belge talebi iletilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewDocument = async (document: StudentDocument, status: "Onaylandı" | "Reddedildi" | "YenidenYukleme") => {
    const reason = status === "Onaylandı"
      ? null
      : window.prompt(status === "Reddedildi" ? "Ret gerekçesi" : "Öğrenciden istenen yeni belge ve gerekçesi");
    if (status !== "Onaylandı" && !reason?.trim()) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await request(`/api/academic/documents/${document.id}/review`, {
        method: "POST",
        body: JSON.stringify({ status, reason })
      });
      setNotice(status === "Onaylandı" ? "Belge onaylandı." : status === "Reddedildi" ? "Belge gerekçesiyle reddedildi." : "Öğrenciden yeni belge istendi.");
      await refreshDocuments(documentStudentFilter ? Number(documentStudentFilter) : undefined);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Belge incelenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDocument = async (document: StudentDocument) => {
    if (!document.hasFile) return;
    if (demoMode) {
      setNotice("Demo örneklerinde gerçek dosya bulunmuyor.");
      return;
    }
    try {
      const response = await request(`/api/academic/documents/${document.id}/download`);
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = document.fileName;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Belge indirilemedi.");
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
      setAdvisingForm(current => ({ ...current, reason: "" }));
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
      await request(editingCatalogCourseId === null ? "/api/academic/catalog" : `/api/academic/catalog/${editingCatalogCourseId}`, {
        method: editingCatalogCourseId === null ? "POST" : "PUT",
        body: JSON.stringify({
          code: catalogForm.code,
          name: catalogForm.name,
          ects: Number(catalogForm.ects),
          credits: catalogForm.credits ? Number(catalogForm.credits) : null,
          curriculumYear: catalogForm.curriculumYear ? Number(catalogForm.curriculumYear) : null,
          reason: editingCatalogCourseId === null ? null : "Katalog bilgileri koordinatör tarafından güncellendi."
        })
      });
      setCatalogForm({ code: "", name: "", ects: "5", credits: "", curriculumYear: "" });
      setEditingCatalogCourseId(null);
      const response = await request("/api/academic/catalog?includeInactive=true");
      setCatalog(await response.json() as CatalogCourse[]);
      setNotice(editingCatalogCourseId === null ? "Ders kataloğa eklendi." : "Ders kataloğu güncellendi.");
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Ders eklenemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const deactivateCatalogCourse = async (course: CatalogCourse) => {
    const reason = window.prompt(`${course.code} dersini pasife alma gerekçesi`);
    if (!reason?.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await request(`/api/academic/catalog/${course.id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: reason.trim() })
      });
      const response = await request("/api/academic/catalog?includeInactive=true");
      setCatalog(await response.json() as CatalogCourse[]);
      setNotice(`${course.code} dersi pasife alındı.`);
    } catch (catalogError) {
      setError(catalogError instanceof Error ? catalogError.message : "Ders pasife alınamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  const editCatalogCourse = (course: CatalogCourse) => {
    setCatalogForm({
      code: course.code,
      name: course.name,
      ects: String(course.ects),
      credits: course.credits === null ? "" : String(course.credits),
      curriculumYear: course.curriculumYear === null || course.curriculumYear === undefined ? "" : String(course.curriculumYear),
    });
    setEditingCatalogCourseId(course.id);
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

  useEffect(() => {
    if (!isCoordinator || activeView !== "rules" || selectedStudentId === null) return;
    // Load the selected student's saved academic value and private note before editing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAdvisingData(selectedStudentId).catch(loadError => {
      setError(loadError instanceof Error ? loadError.message : "Öğrenci akademik bilgileri yüklenemedi.");
    });
  }, [activeView, isCoordinator, refreshAdvisingData, selectedStudentId]);

  if (busy) {
    return <main className="mx-auto max-w-5xl p-8 text-slate-600" role="status">Oturum kontrol ediliyor…</main>;
  }

  if (!user) {
    return (
      <main className="login-page">
        <header className="login-header">
          <div className="portal-brand">
            <span className="brand-mark"><Landmark aria-hidden="true" size={20} /></span>
            <span>
              <strong>Akademik Portal</strong>
              <small>ÇAP · YDP Koordinasyon Sistemi</small>
            </span>
          </div>
          <span className="secure-label"><ShieldCheck aria-hidden="true" size={15} /> Güvenli erişim</span>
        </header>

        <section className="login-card">
          <div className="login-emblem"><GraduationCap aria-hidden="true" size={25} /></div>
          <p className="eyebrow">{showSetup ? "İLK KURULUM" : "HOŞ GELDİNİZ"}</p>
          <h1>{showSetup ? "Koordinatör hesabı oluşturun" : "Akademik Portal Girişi"}</h1>
          <p className="login-description">
            {showSetup
              ? "Sistemin ilk koordinatör hesabını tanımlamak için bilgilerinizi girin."
              : "Ders ve akademik süreçlerinizi görüntülemek için hesabınızla giriş yapın."}
          </p>

          {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
          {notice && <p className="form-alert form-alert-success" role="status">{notice}</p>}

          <form className="login-form" onSubmit={showSetup ? setupCoordinator : signIn}>
            <label>
              E-posta adresi
              <input autoComplete="username" required type="email" value={loginEmail} onChange={event => setLoginEmail(event.target.value)} placeholder="ad.soyad@universite.edu.tr" />
            </label>
            <label>
              {showSetup ? "Yeni parola" : "Parola"}
              <input autoComplete={showSetup ? "new-password" : "current-password"} required type="password" value={loginPassword} onChange={event => setLoginPassword(event.target.value)} placeholder="Parolanızı girin" />
            </label>
            {showSetup && (
              <label>
                Kurulum anahtarı
                <input required type="password" value={setupKey} onChange={event => setSetupKey(event.target.value)} placeholder="Sunucu yöneticisinden aldığınız anahtar" />
              </label>
            )}
            <button disabled={submitting} className="primary-button">
              {submitting ? "İşleniyor…" : showSetup ? "Koordinatör hesabını oluştur" : <>Giriş yap <ArrowRight aria-hidden="true" size={17} /></>}
            </button>
          </form>

          <button type="button" onClick={() => { setShowSetup(!showSetup); setError(""); }} className="setup-toggle">
            {showSetup ? "Giriş ekranına dön" : "İlk koordinatör kurulumu"}
          </button>
          {showSetup && <p className="setup-help">Kurulum için backend üzerinde en az 32 karakterli COORDINATOR_SETUP_KEY tanımlanmalıdır.</p>}
          {isDemoAvailable && !showSetup && (
            <section className="mt-6 border-t border-slate-200 pt-5" aria-label="Demo görünümleri">
              <h2 className="text-center text-sm font-semibold text-slate-800">Backend olmadan arayüzü inceleyin</h2>
              <p className="mt-1 text-center text-xs leading-5 text-slate-500">
                Yalnızca örnek veriler gösterilir; gerçek giriş yapılmaz ve hiçbir işlem kaydedilmez.
              </p>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={() => enterDemo("KOORDINATOR")} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100">
                  Koordinatör görünümü
                </button>
                <button type="button" onClick={() => enterDemo("OGRENCI")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Öğrenci görünümü
                </button>
                <button type="button" onClick={() => enterDemo("BOLUM_BASKANI")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Bölüm başkanı görünümü
                </button>
              </div>
            </section>
          )}
        </section>

        <footer className="login-footer">
          <span>ÇAP · YDP Akademik Takip Sistemi</span>
          <span>Öğrenci ve koordinatör işlemleri</span>
        </footer>
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
    <main className="portal-page">
      <header className="portal-header">
        <div className="portal-header-main">
          <button type="button" className="portal-brand portal-home-button" onClick={() => setActiveView("overview")} aria-current={activeView === "overview" ? "page" : undefined}>
            <span className="brand-mark"><Landmark aria-hidden="true" size={20} /></span>
            <span>
              <strong>Akademik Portal</strong>
              <small>ÇAP · YDP Koordinasyon Sistemi</small>
            </span>
          </button>
          <div className="account-menu">
            <span className="account-avatar">{isCoordinator ? "K" : isChair ? "B" : "Ö"}</span>
            <span className="account-details">
              <strong>{user.email}</strong>
              <small>{isCoordinator ? "Koordinatör" : isChair ? "Bölüm başkanı · salt okunur" : "Öğrenci"}</small>
            </span>
            <button onClick={signOut} className="sign-out-button" aria-label="Güvenli çıkış">
              <LogOut aria-hidden="true" size={16} /><span>Çıkış</span>
            </button>
          </div>
        </div>
        <nav className="portal-nav" aria-label="Ana gezinme">
          {isCoordinator && <>
            <button type="button" onClick={() => setActiveView("overview")} aria-current={activeView === "overview" ? "page" : undefined}><Landmark aria-hidden="true" size={16} /> Ana menü</button>
            <button type="button" onClick={() => setActiveView("students")} aria-current={activeView === "students" ? "page" : undefined}><UsersRound aria-hidden="true" size={16} /> Öğrenci yönetimi</button>
            <button type="button" onClick={() => setActiveView("courses")} aria-current={activeView === "courses" ? "page" : undefined}><BookOpen aria-hidden="true" size={16} /> Ders ve onaylar</button>
            <button type="button" onClick={() => setActiveView("documents")} aria-current={activeView === "documents" ? "page" : undefined}><FileText aria-hidden="true" size={16} /> Belge inceleme</button>
            <button type="button" onClick={() => setActiveView("messages")} aria-current={activeView === "messages" ? "page" : undefined}><MessageSquareText aria-hidden="true" size={16} /> Mesajlar</button>
            <button type="button" onClick={() => setActiveView("rules")} aria-current={activeView === "rules" ? "page" : undefined}><ShieldCheck aria-hidden="true" size={16} /> Yönerge ve kararlar</button>
            <button type="button" onClick={() => setActiveView("audit")} aria-current={activeView === "audit" ? "page" : undefined}><Clock3 aria-hidden="true" size={16} /> İşlem geçmişi</button>
          </>}
          {isStudent && <>
            <button type="button" onClick={() => setActiveView("courses")} aria-current={activeView === "courses" ? "page" : undefined}><BookOpen aria-hidden="true" size={16} /> Ders ve not durumu</button>
            <button type="button" onClick={() => setActiveView("documents")} aria-current={activeView === "documents" ? "page" : undefined}><FileText aria-hidden="true" size={16} /> Belge ve transkript</button>
            <button type="button" onClick={() => setActiveView("messages")} aria-current={activeView === "messages" ? "page" : undefined}><MessageSquareText aria-hidden="true" size={16} /> Koordinatör mesajları</button>
          </>}
          {isChair && <>
            <button type="button" onClick={() => setActiveView("students")} aria-current={activeView === "students" ? "page" : undefined}><UsersRound aria-hidden="true" size={16} /> Öğrenci özeti</button>
            <button type="button" onClick={() => setActiveView("documents")} aria-current={activeView === "documents" ? "page" : undefined}><FileText aria-hidden="true" size={16} /> Öğrenci belgeleri</button>
            <button type="button" onClick={() => setActiveView("audit")} aria-current={activeView === "audit" ? "page" : undefined}><ShieldCheck aria-hidden="true" size={16} /> Denetim kayıtları</button>
          </>}
        </nav>
      </header>

      <div className="portal-content">
        {demoMode && (
          <aside className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4" aria-label="Demo modu">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-950">Demo modu · örnek veriler</p>
                <p className="mt-1 text-xs text-blue-800">Örnek veriler üzerinde formları inceleyebilirsiniz; gönderim denemeleri backend&apos;e iletilmez ve veri kaydedilmez.</p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Demo rolünü değiştir">
                <button type="button" onClick={() => enterDemo("KOORDINATOR")} aria-pressed={isCoordinator} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 aria-pressed:bg-blue-100">Koordinatör</button>
                <button type="button" onClick={() => enterDemo("OGRENCI")} aria-pressed={isStudent} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 aria-pressed:bg-blue-100">Öğrenci</button>
                <button type="button" onClick={() => enterDemo("BOLUM_BASKANI")} aria-pressed={isChair} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 aria-pressed:bg-blue-100">Bölüm başkanı</button>
              </div>
            </div>
          </aside>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}

        {activeView === "overview" && <>
        <section className="welcome-panel" id="overview">
          <div className="welcome-copy">
            <p className="eyebrow">ÇAP · YDP AKADEMİK PORTALI</p>
            <h1>{isStudent && student ? `Hoş geldiniz, ${student.fullName}` : isCoordinator ? "Koordinasyon çalışma alanı" : "Akademik süreçlere genel bakış"}</h1>
            <p>
              {isStudent
                ? "Ders kayıtlarınızı, onay durumlarını ve koordinatörünüzle yazışmalarınızı buradan takip edin."
                : isCoordinator
                  ? "Öğrenci kayıtlarını, ders onaylarını ve yönerge kontrollerini tek yerden yönetin."
                  : "Öğrenci kayıtlarını ve değiştirilemeyen işlem geçmişini görüntüleyin."}
            </p>
          </div>
          <div className="welcome-badge"><GraduationCap aria-hidden="true" size={22} /><span>{isCoordinator ? "Koordinatör paneli" : isChair ? "Salt okunur panel" : student?.program === "YDP" ? "Yandal programı" : "Çift anadal programı"}</span></div>
        </section>

        <section className="summary-grid" aria-label="Akademik özet">
          <article className="summary-card">
            <span className="summary-icon summary-icon-blue"><UsersRound aria-hidden="true" size={18} /></span>
            <p>{isStudent ? "Öğrenci hesabı" : "Kayıtlı öğrenciler"}</p>
            <strong>{isStudent ? (student ? "1" : "—") : students.length}</strong>
            <small>{isStudent ? student?.studentNumber ?? "Profil yükleniyor" : "Sistemdeki öğrenci sayısı"}</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon-teal"><BookOpen aria-hidden="true" size={18} /></span>
            <p>Ders kayıtları</p>
            <strong>{records.length}</strong>
            <small>Seçili öğrenci için</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon-amber"><Clock3 aria-hidden="true" size={18} /></span>
            <p>Onay bekleyen</p>
            <strong>{pendingRecords.length}</strong>
            <small>Seçili öğrencinin kayıtları</small>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon-violet"><CheckCircle2 aria-hidden="true" size={18} /></span>
            <p>Tamamlanan AKTS</p>
            <strong>{completedEcts}</strong>
            <small>Onaylı derslerden</small>
          </article>
        </section>
        </>}

        {isCoordinator && activeView === "students" && (
          <section id="student-management" className="management-section">
            <details className="management-card" open>
              <summary>
                <span className="management-title">
                  <span className="summary-icon summary-icon-blue"><UsersRound aria-hidden="true" size={18} /></span>
                  <span><strong>Yönetim araçları</strong><small>Öğrenci, bölüm başkanı ve ders kataloğu işlemleri</small></span>
                </span>
                <span className="expand-label">Aç / kapat <ArrowRight aria-hidden="true" size={15} /></span>
              </summary>
              <div className="management-content">
                <div>
                  <h2>Öğrenci ekle</h2>
                  <p className="section-description">Öğrenci kaydını ve giriş hesabını birlikte oluşturun.</p>
                </div>
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
                <form onSubmit={addCatalogCourse} className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-6">
              <h3 className="font-semibold sm:col-span-2 lg:col-span-6">{editingCatalogCourseId === null ? "Ders kataloğuna ders ekle" : "Katalog dersini düzenle"}</h3>
              <input required maxLength={20} placeholder="Ders kodu" value={catalogForm.code} onChange={event => setCatalogForm({ ...catalogForm, code: event.target.value })} className="rounded-lg border p-2" />
              <input required maxLength={100} placeholder="Ders adı" value={catalogForm.name} onChange={event => setCatalogForm({ ...catalogForm, name: event.target.value })} className="rounded-lg border p-2" />
              <input required type="number" min="1" max="60" placeholder="AKTS" value={catalogForm.ects} onChange={event => setCatalogForm({ ...catalogForm, ects: event.target.value })} className="rounded-lg border p-2" />
              <input type="number" min="0" max="30" placeholder="Kredi (isteğe bağlı)" value={catalogForm.credits} onChange={event => setCatalogForm({ ...catalogForm, credits: event.target.value })} className="rounded-lg border p-2" />
              <input type="number" min="1900" max="2200" placeholder="Müfredat yılı" value={catalogForm.curriculumYear} onChange={event => setCatalogForm({ ...catalogForm, curriculumYear: event.target.value })} className="rounded-lg border p-2" />
              <div className="flex gap-2">
                <button disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">{editingCatalogCourseId === null ? "Kataloğa ekle" : "Değişiklikleri kaydet"}</button>
                {editingCatalogCourseId !== null && <button type="button" onClick={() => { setEditingCatalogCourseId(null); setCatalogForm({ code: "", name: "", ects: "5", credits: "", curriculumYear: "" }); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Vazgeç</button>}
              </div>
                </form>
                <div className="mt-5 border-t pt-4">
                  <h3 className="font-semibold">Ders kataloğu</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b text-slate-500"><tr><th className="p-2">Ders</th><th className="p-2">Kredi / AKTS</th><th className="p-2">Durum</th><th className="p-2">İşlemler</th></tr></thead>
                      <tbody className="divide-y">
                        {catalog.map(course => <tr key={course.id}>
                          <td className="p-2">{course.code} · {course.name}{course.curriculumYear ? <span className="block text-xs text-slate-500">Müfredat {course.curriculumYear}</span> : null}</td>
                          <td className="p-2">{course.credits ?? "—"} kredi · {course.ects} AKTS</td>
                          <td className="p-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${course.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{course.active ? "Etkin" : "Pasif"}</span></td>
                          <td className="space-x-2 p-2">
                            {course.active && <>
                              <button type="button" onClick={() => editCatalogCourse(course)} className="rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50">Düzenle</button>
                              <button type="button" disabled={submitting} onClick={() => void deactivateCatalogCourse(course)} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Pasife al</button>
                            </>}
                          </td>
                        </tr>)}
                        {catalog.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Katalogda ders yok.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </details>
          </section>
        )}

        {(isCoordinator || isStudent) && activeView === "courses" && <section id="courses" className="workspace-card">
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
                      {catalog.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} ({item.ects} AKTS)</option>)}
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
                      {isCoordinator && <td className="p-2">
                        {record.reviewStatus === "Bekliyor" && <>
                          <div className="flex flex-wrap gap-2">
                            <button disabled={submitting} onClick={() => void reviewRecord(record.id, "Onaylandı")} className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">✓ Onayla</button>
                            <button disabled={submitting} onClick={() => void reviewRecord(record.id, "Reddedildi")} className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60">× Reddet</button>
                          </div>
                        </>}
                      </td>}
                    </tr>)}
                    {records.length === 0 && <tr><td colSpan={isCoordinator ? 7 : 6} className="p-5 text-center text-slate-500">Henüz ders kaydı yok.</td></tr>}
                  </tbody>
                </table>
              </div>

            </>
          )}
        </section>}

        {activeView === "documents" && (
          <section id="documents" className="workspace-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="section-title"><FileText aria-hidden="true" size={19} /> {isStudent ? "Belge ve transkript" : isCoordinator ? "Belge inceleme kuyruğu" : "Öğrenci belgeleri · salt okunur"}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {isStudent
                    ? "Yüklediğiniz belgeler öğrenci kaydınıza özel arşivde saklanır; koordinatör inceleme sonucunu ve gerekçesini burada görebilirsiniz."
                    : "Belgeler öğrenci kayıtlarına bağlı saklanır; bu ekran tüm öğrencilerin evraklarına erişmek ve işlem geçmişini takip etmek için merkezi listedir."}
                </p>
              </div>
              {(isCoordinator || isChair) && (
                <select aria-label="Belge listesinde öğrenci filtresi" value={documentStudentFilter} onChange={event => setDocumentStudentFilter(event.target.value)} className="rounded-lg border p-2">
                  <option value="">Tüm öğrenciler</option>
                  {students.map(item => <option key={item.id} value={item.id}>{item.studentNumber} · {item.fullName}</option>)}
                </select>
              )}
            </div>

            {isStudent && student && (
              <form onSubmit={uploadDocument} className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <h3 className="font-semibold">Yeni resmi belge yükle</h3>
                  <p className="mt-1 text-xs text-slate-600">PDF, en fazla 25 MB. Belge önce zararlı yazılım taramasından geçer, ardından koordinatör incelemesine gönderilir.</p>
                </div>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Belge türü
                  <select required value={documentUploadForm.documentType} onChange={event => setDocumentUploadForm({ ...documentUploadForm, documentType: event.target.value })} className="rounded-lg border bg-white p-2">
                    {DOCUMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">PDF dosyası
                  <input required type="file" accept="application/pdf,.pdf" onChange={event => setSelectedDocumentFile(event.target.files?.[0] ?? null)} className="rounded-lg border bg-white p-2 text-sm" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Akademik yıl (isteğe bağlı)
                  <input pattern="\d{4}-\d{4}" placeholder="2025-2026" value={documentUploadForm.academicYear} onChange={event => setDocumentUploadForm({ ...documentUploadForm, academicYear: event.target.value })} className="rounded-lg border p-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Dönem
                  <select value={documentUploadForm.term} onChange={event => setDocumentUploadForm({ ...documentUploadForm, term: event.target.value })} className="rounded-lg border bg-white p-2">
                    <option>Güz</option><option>Bahar</option><option>Yaz</option>
                  </select>
                </label>
                <button disabled={submitting || !selectedDocumentFile} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">
                  {submitting ? "Güvenlik kontrolü yapılıyor…" : "Güvenli yükle ve incelemeye gönder"}
                </button>
              </form>
            )}

            {isCoordinator && (
              <form onSubmit={requestStudentDocument} className="mt-5 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <h3 className="font-semibold">Öğrenciden yeni belge iste</h3>
                  <p className="mt-1 text-xs text-slate-600">Seçilen öğrenci kendi Belge ve transkript ekranında talebi ve gerekçeyi görür; yanıtı yeni sürüm olarak arşivlenir.</p>
                </div>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Öğrenci
                  <select required value={documentRequestForm.studentId} onChange={event => setDocumentRequestForm({ ...documentRequestForm, studentId: event.target.value })} className="rounded-lg border bg-white p-2">
                    <option value="">Öğrenci seçin</option>
                    {students.map(item => <option key={item.id} value={item.id}>{item.studentNumber} · {item.fullName}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Belge türü
                  <select value={documentRequestForm.documentType} onChange={event => setDocumentRequestForm({ ...documentRequestForm, documentType: event.target.value })} className="rounded-lg border bg-white p-2">
                    {DOCUMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Akademik yıl (isteğe bağlı)
                  <input pattern="\d{4}-\d{4}" placeholder="2025-2026" value={documentRequestForm.academicYear} onChange={event => setDocumentRequestForm({ ...documentRequestForm, academicYear: event.target.value })} className="rounded-lg border p-2" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">Dönem
                  <select value={documentRequestForm.term} onChange={event => setDocumentRequestForm({ ...documentRequestForm, term: event.target.value })} className="rounded-lg border bg-white p-2">
                    <option>Güz</option><option>Bahar</option><option>Yaz</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">Gerekçe / istenen düzeltme
                  <textarea required maxLength={1000} value={documentRequestForm.reason} onChange={event => setDocumentRequestForm({ ...documentRequestForm, reason: event.target.value })} placeholder="Örn. İmzalı ve güncel tarihli transkripti yükleyiniz." className="min-h-20 rounded-lg border p-2" />
                </label>
                <button disabled={submitting} className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2">Belge talebini öğrenciye ilet</button>
              </form>
            )}

            <div className="mt-5 space-y-3" aria-live="polite">
              {documents.map(document => {
                const typeLabel = DOCUMENT_TYPES.find(type => type.value === document.documentType)?.label ?? document.documentType;
                const statusStyle = document.status === "Onaylandı"
                  ? "bg-emerald-50 text-emerald-800"
                  : document.status === "Reddedildi"
                    ? "bg-red-50 text-red-800"
                    : document.status === "YenidenYukleme"
                      ? "bg-amber-50 text-amber-900"
                      : document.status === "YeniBelgeYuklendi"
                        ? "bg-blue-50 text-blue-800"
                        : "bg-slate-100 text-slate-700";
                const statusLabel = document.status === "YenidenYukleme"
                  ? "Yeni belge bekleniyor"
                  : document.status === "YeniBelgeYuklendi"
                    ? "Yeni sürüm yüklendi"
                    : document.status;
                return (
                  <article key={document.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{typeLabel}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle}`}>{statusLabel}</span>
                        </div>
                        {(isCoordinator || isChair) && <p className="mt-1 text-sm text-slate-600">{document.studentName} · {document.studentNumber}</p>}
                        <p className="mt-1 break-all text-sm text-slate-700">{document.fileName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {document.academicYear ? `${document.academicYear} ${document.term ?? ""} · ` : ""}
                          {new Date(document.uploadedAt).toLocaleString("tr-TR")}
                          {document.hasFile ? ` · ${(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : ""}
                          {document.reviewedAt ? ` · İncelendi: ${new Date(document.reviewedAt).toLocaleString("tr-TR")}` : ""}
                        </p>
                        {document.reviewReason && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><strong>Koordinatör açıklaması:</strong> {document.reviewReason}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={!document.hasFile} onClick={() => void downloadDocument(document)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                          PDF&apos;i indir
                        </button>
                        {isCoordinator && document.hasFile && document.status === "Bekliyor" && <>
                          <button type="button" disabled={submitting} onClick={() => void reviewDocument(document, "Onaylandı")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">✓ Onayla</button>
                          <button type="button" disabled={submitting} onClick={() => void reviewDocument(document, "Reddedildi")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60">× Reddet</button>
                          <button type="button" disabled={submitting} onClick={() => void reviewDocument(document, "YenidenYukleme")} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60">Yeni belge iste</button>
                        </>}
                      </div>
                    </div>
                  </article>
                );
              })}
              {documents.length === 0 && <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">Bu filtrede belge veya belge talebi bulunmuyor.</p>}
            </div>
          </section>
        )}

        {!isChair && activeView === "messages" && (
          <section id="messages" className="workspace-card message-section">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="section-title"><MessageSquareText aria-hidden="true" size={19} /> Koordinatör–öğrenci yazışması</h2>
                {selectedStudent && <p className="mt-1 text-sm text-slate-600">{selectedStudent.fullName} · {selectedStudent.studentNumber}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {isCoordinator && (
                  <select aria-label="Mesajlaşılacak öğrenciyi seç" value={selectedStudentId ?? ""} onChange={event => {
                    const id = Number(event.target.value);
                    setSelectedStudentId(id);
                    setMessages([]);
                    setError("");
                    if (demoMode) void refreshMessages(id);
                  }} className="rounded-lg border p-2">
                    {students.length === 0 && <option value="">Henüz öğrenci yok</option>}
                    {students.map(item => <option key={item.id} value={item.id}>{item.studentNumber} · {item.fullName}</option>)}
                  </select>
                )}
                {selectedStudent && <button onClick={() => void refreshMessages(selectedStudent.id)} className="text-sm text-blue-700 underline">Mesajları yenile</button>}
              </div>
            </div>
            {selectedStudent ? (
              <>
                <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
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
                <form onSubmit={sendMessage} className="mt-4 flex items-end gap-2">
                  <textarea required maxLength={10000} value={messageText} onChange={event => setMessageText(event.target.value)} placeholder="Mesajınızı yazın" className="min-h-24 flex-1 rounded-lg border p-3" />
                  <button disabled={submitting} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Gönder</button>
                </form>
                <p className="mt-2 text-xs text-slate-500">Mesajlar kalıcıdır, silinemez. Belge eki bu sürümde devre dışıdır.</p>
              </>
            ) : <p className="mt-4 text-sm text-slate-500">Mesajları görüntülemek için önce bir öğrenci kaydı oluşturulmalıdır.</p>}
          </section>
        )}

        {isCoordinator && activeView === "rules" && (
          <section id="rules" className="workspace-card">
            <h2 className="section-title"><ShieldCheck aria-hidden="true" size={19} /> Yönerge ve kararlar</h2>
            {selectedStudent ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <form onSubmit={saveAdvisingData} className="space-y-3 rounded-lg bg-slate-50 p-4">
                  <h3 className="font-semibold">Akademik uygunluk ve koordinatör notu · {selectedStudent.fullName}</h3>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Anadal GANO · yönerge uygunluk kontrolü</p>
                    <p className="text-xs leading-5 text-slate-600">GANO, yürürlükteki ÇAP/YDP eşik şartını kontrol etmek için kullanılır; koordinatör özel notundan ayrıdır. Resmi transkriptteki değeri girin ve kaynağını belirtin. Belgeyi öğrenci arşivinden ayrıca inceleyebilirsiniz.</p>
                    <input aria-label="Anadal GANO" type="number" min="0" max="4" step="0.01" placeholder="Örn. 3,20" value={advisingForm.majorGpa} onChange={event => setAdvisingForm({ ...advisingForm, majorGpa: event.target.value })} className="w-full rounded-lg border p-2" />
                    <input required={Boolean(advisingForm.majorGpa)} maxLength={100} placeholder="GANO kaynağı (örn. 2025-2026 güz transkripti)" value={advisingForm.gpaSource} onChange={event => setAdvisingForm({ ...advisingForm, gpaSource: event.target.value })} className="w-full rounded-lg border p-2" />
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-sm font-semibold">Koordinatör özel notu</p>
                    <p className="text-xs leading-5 text-slate-600">Bu iç not öğrenciye gösterilmez; yalnızca koordinatörün takip amaçlı açıklamasıdır.</p>
                    <textarea maxLength={5000} placeholder="Öğrenciye gösterilmeyen koordinatör notu" value={advisingForm.privateNote} onChange={event => setAdvisingForm({ ...advisingForm, privateNote: event.target.value })} className="min-h-20 w-full rounded-lg border p-2" />
                  </div>
                  <input required maxLength={1000} placeholder="Değişiklik gerekçesi" value={advisingForm.reason} onChange={event => setAdvisingForm({ ...advisingForm, reason: event.target.value })} className="w-full rounded-lg border p-2" />
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
                  <h3 className="w-full font-semibold">Koordinatör kararı · {selectedStudent.fullName}</h3>
                  <select value={decisionForm.decision} onChange={event => setDecisionForm({ ...decisionForm, decision: event.target.value })} className="rounded-lg border bg-white p-2">
                    <option value="Mezun">Mezun</option><option value="SertifikaVerildi">Sertifika verildi</option><option value="KayitIptal">Kayıt iptali</option><option value="Aktif">Aktif</option>
                  </select>
                  <input required maxLength={1000} placeholder="Karar gerekçesi" value={decisionForm.reason} onChange={event => setDecisionForm({ ...decisionForm, reason: event.target.value })} className="min-w-64 flex-1 rounded-lg border p-2" />
                  <button disabled={submitting} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Kararı kaydet</button>
                </form>
              </div>
            ) : <p className="mt-4 text-sm text-slate-500">Yönerge ve karar işlemleri için önce bir öğrenci kaydı oluşturulmalıdır.</p>}
          </section>
        )}

        {isChair && activeView === "students" && (
          <section className="workspace-card">
            <h2 className="section-title"><UsersRound aria-hidden="true" size={19} /> Öğrenci özeti · salt okunur</h2>
            <p className="mt-1 text-sm text-slate-600">Öğrenci ve program bilgilerini görüntüleyin; kayıt üzerinde değişiklik yapılamaz.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b text-slate-500"><tr><th className="p-2">Öğrenci</th><th className="p-2">Program</th><th className="p-2">Kabul dönemi</th><th className="p-2">Durum</th><th className="p-2">İşlem</th></tr></thead>
                <tbody className="divide-y">
                  {students.map(item => <tr key={item.id}>
                    <td className="p-2">{item.fullName}<span className="block text-xs text-slate-500">{item.studentNumber} · {item.email}</span></td>
                    <td className="p-2">{item.program === "CAP" ? "ÇAP" : "YDP"}</td>
                    <td className="p-2">{item.admissionTerm}</td>
                    <td className="p-2">{item.status}</td>
                    <td className="p-2"><button type="button" onClick={async () => {
                      setSelectedStudentId(item.id);
                      try { await refreshRecords(item.id); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Öğrenci dersleri yüklenemedi."); }
                    }} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-50">Derslerini görüntüle</button></td>
                  </tr>)}
                  {students.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">Görüntülenecek öğrenci yok.</td></tr>}
                </tbody>
              </table>
            </div>
            {selectedStudentId !== null && students.find(item => item.id === selectedStudentId) && (
              <div className="mt-5 border-t pt-4">
                <h3 className="font-semibold">{students.find(item => item.id === selectedStudentId)?.fullName} · Ders kayıtları</h3>
                <div className="mt-2 space-y-2">
                  {records.map(record => <article key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                    <span>{record.code} · {record.name} · {record.academicYear} {record.term}</span>
                    <span className="text-slate-600">{record.status} · {record.reviewStatus}{record.grade ? ` · ${record.grade}` : ""}</span>
                  </article>)}
                  {records.length === 0 && <p className="text-sm text-slate-500">Bu öğrenci için ders kaydı yok.</p>}
                </div>
              </div>
            )}
          </section>
        )}

        {(isCoordinator || isChair) && activeView === "audit" && (
          <section id="audit" className="workspace-card">
            <h2 className="section-title"><ShieldCheck aria-hidden="true" size={19} /> İşlem geçmişi · salt okunur</h2>
            <div className="mt-3 space-y-2">
              {audit.map(item => <article key={item.id} className="border-b py-2 text-sm">
                <strong>{item.action}</strong> · {item.recordType} #{item.recordId} · {new Date(item.timestamp).toLocaleString("tr-TR")}
                {item.reason && <p className="text-slate-600">Gerekçe: {item.reason}</p>}
              </article>)}
              {audit.length === 0 && <p className="text-sm text-slate-500">Henüz işlem kaydı yok.</p>}
            </div>
          </section>
        )}

        <footer className="portal-footer">
          <span>ÇAP · YDP Akademik Takip Sistemi</span>
          <span>Belge yükleme bu sürümde kullanılamıyor.</span>
        </footer>
      </div>
    </main>
  );
}
