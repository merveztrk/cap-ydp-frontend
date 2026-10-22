"use client";

import React, { useState, useEffect } from "react";

interface ProtocolCourse {
  id: number;
  courseCode: string;
  courseName: string;
  akts: number;
  status: string;
  exemptionReason?: string;
  grade?: string;
  semesterTaken?: string;
}

interface StudentProfile {
  id: number;
  studentNumber: string;
  fullName: string;
  majorDepartment: string;
  doubleMajorDepartment: string;
  currentMajorGano: number;
  currentSemester: number;
  isCapApproved: boolean;
  isLocked: boolean;
  coordinatorPrivateNote?: string;
  courses: ProtocolCourse[];
}

interface AuditLogItem {
  id: number;
  performedBy: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

const DONEMLER = [
  "2024-2025 Güz",
  "2024-2025 Bahar",
  "2025-2026 Güz",
  "2025-2026 Bahar"
];

export default function AcademicPortal() {
  // Canlıda Vercel ortam değişkeni (Render backend URL), lokalde localhost kullanılır
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5021";

  // Aktif Rol Yönetimi: KOORDINATOR, OGRENCI, BOLUM_BASKANI
  const [role, setRole] = useState<"KOORDINATOR" | "OGRENCI" | "BOLUM_BASKANI">("BOLUM_BASKANI");
  
  // Alt Sekmeler
  const [koordTab, setKoordTab] = useState<"PANEL" | "OGRENCI_EKLE" | "EVRAK_ONAY" | "INTIBAK" | "YONERGE">("INTIBAK");
  const [ogrenciTab, setOgrenciTab] = useState<"DERS_NOT" | "EVRAK_YUKLE" | "MESAJLAR">("DERS_NOT");
  const [baskanTab, setBaskanTab] = useState<"GENEL_BAKIS" | "DENETIM_KUTUGU" | "OGRENCI_LISTESI">("GENEL_BAKIS");

  // Dönem ve Filtreleme
  const [seciliDonem, setSeciliDonem] = useState<string>("2025-2026 Bahar");
  const [tumDonemleriGoster, setTumDonemleriGoster] = useState<boolean>(false);

  // Canlı Veriler
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State'leri
  const [cCode, setCCode] = useState("");
  const [cName, setCName] = useState("");
  const [cAkts, setCAkts] = useState(5);
  const [cStatus, setCStatus] = useState<"Alinacak" | "Muaf">("Alinacak");
  const [cReason, setCReason] = useState("");
  const [cSemester, setCSemester] = useState("2025-2026 Bahar");

  // Veri Çekme
  const fetchData = async () => {
    try {
      setLoading(true);
      const resStudent = await fetch(`${API_BASE}/api/capydp/student`);
      if (resStudent.ok) setStudent(await resStudent.json());

      const resLogs = await fetch(`${API_BASE}/api/capydp/audit-logs`);
      if (resLogs.ok) setAuditLogs(await resLogs.json());
    } catch {
      console.log("Backend offline modda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/capydp/student/approve`, { method: "POST" });
      if (res.ok) fetchData();
    } catch {
      alert("Onay işlemi başarısız.");
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode || !cName) return;
    try {
      const res = await fetch(`${API_BASE}/api/capydp/student/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: cCode,
          courseName: cName,
          akts: Number(cAkts),
          status: cStatus,
          exemptionReason: cStatus === "Muaf" ? cReason : null,
          semesterTaken: cSemester
        })
      });
      if (res.ok) {
        setCCode("");
        setCName("");
        setCReason("");
        fetchData();
      }
    } catch {
      alert("Ders eklenemedi.");
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("Bu dersi protokolden kaldırmak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/capydp/student/courses/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch {
      alert("Silinemedi.");
    }
  };

  const filtrelenmisDersler = student?.courses.filter(c => tumDonemleriGoster ? true : c.semesterTaken === seciliDonem) || [];
  const donemlikToplamAkts = filtrelenmisDersler.reduce((acc, c) => acc + c.akts, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between">
      {/* ÜST GLOBAL HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-base shadow-sm">🏛️</div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 leading-tight">Akademik Portal</h1>
                <p className="text-[11px] text-slate-400">ÇAP & YDP Yönetim ve Karar Destek Sistemi</p>
              </div>
            </div>

            {/* Rol Seçici Geçiş */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setRole("BOLUM_BASKANI")}
                className={`px-3 py-1 rounded-md transition ${role === "BOLUM_BASKANI" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Bölüm Başkanlığı
              </button>
              <button
                onClick={() => setRole("KOORDINATOR")}
                className={`px-3 py-1 rounded-md transition ${role === "KOORDINATOR" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Koordinatör
              </button>
              <button
                onClick={() => setRole("OGRENCI")}
                className={`px-3 py-1 rounded-md transition ${role === "OGRENCI" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Öğrenci
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right hidden sm:block">
              <p className="font-bold text-slate-800">
                {role === "BOLUM_BASKANI" ? "Prof. Dr. Kemal Vural" : role === "KOORDINATOR" ? "Prof. Dr. Ayşe Yılmaz" : "Merve Öztürk"}
              </p>
              <p className="text-[11px] text-slate-400">
                {role === "BOLUM_BASKANI" ? "Bilgisayar Mühendisliği Bölüm Başkanı" : role === "KOORDINATOR" ? "ÇAP/YDP Koordinatörü" : "Öğrenci No: 2133011045"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
              {role === "BOLUM_BASKANI" ? "KV" : role === "KOORDINATOR" ? "AY" : "MÖ"}
            </div>
          </div>
        </div>

        {/* MODÜL ALT NAVİGASYONU */}
        <div className="max-w-7xl mx-auto px-6 flex gap-6 text-xs font-medium text-slate-600 border-t border-slate-100 overflow-x-auto">
          {role === "BOLUM_BASKANI" && (
            <>
              <button onClick={() => setBaskanTab("GENEL_BAKIS")} className={`py-3 border-b-2 transition ${baskanTab === "GENEL_BAKIS" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Genel İzleme & Modüller</button>
              <button onClick={() => setBaskanTab("DENETIM_KUTUGU")} className={`py-3 border-b-2 transition flex items-center gap-1.5 ${baskanTab === "DENETIM_KUTUGU" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>
                Audit Log Canlı Akışı <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
              <button onClick={() => setBaskanTab("OGRENCI_LISTESI")} className={`py-3 border-b-2 transition ${baskanTab === "OGRENCI_LISTESI" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Bölüm Öğrencileri & Gürbüz Durumları</button>
            </>
          )}

          {role === "KOORDINATOR" && (
            <>
              <button onClick={() => setKoordTab("INTIBAK")} className={`py-3 border-b-2 transition ${koordTab === "INTIBAK" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Ders & Müfredat Eşleştirme</button>
              <button onClick={() => setKoordTab("OGRENCI_EKLE")} className={`py-3 border-b-2 transition ${koordTab === "OGRENCI_EKLE" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Öğrenci Ekleme</button>
              <button onClick={() => setKoordTab("EVRAK_ONAY")} className={`py-3 border-b-2 transition ${koordTab === "EVRAK_ONAY" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Onay Bekleyen Evraklar (14)</button>
              <button onClick={() => setKoordTab("YONERGE")} className={`py-3 border-b-2 transition ${koordTab === "YONERGE" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Yönerge & Kurallar</button>
            </>
          )}

          {role === "OGRENCI" && (
            <>
              <button onClick={() => setOgrenciTab("DERS_NOT")} className={`py-3 border-b-2 transition ${ogrenciTab === "DERS_NOT" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Dönemlik Ders ve Not Durumu</button>
              <button onClick={() => setOgrenciTab("EVRAK_YUKLE")} className={`py-3 border-b-2 transition ${ogrenciTab === "EVRAK_YUKLE" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Belge & Transkript Yükleme</button>
              <button onClick={() => setOgrenciTab("MESAJLAR")} className={`py-3 border-b-2 transition ${ogrenciTab === "MESAJLAR" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent hover:text-slate-900"}`}>Koordinatör Mesajlaşma</button>
            </>
          )}
        </div>
      </header>

      {/* ANA İÇERİK ALANI */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1">
        {/* BÖLÜM BAŞKANLIĞI PANELİ */}
        {role === "BOLUM_BASKANI" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full">Bölüm Başkanlığı Yetkili Modu</span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">Bölüm Başkanlığı İzleme ve Denetim Merkezi</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Prof. Dr. Kemal Vural — Bilgisayar Mühendisliği Bölüm Başkanı. ÇAP ve YDP programlarındaki tüm koordinatör kararlarını, intibak protokollerini ve sistem denetim kayıtlarını buradan denetleyebilirsiniz.
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50">Kütüğü İndir</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-sm">Dönem Raporu Al (PDF)</button>
              </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] text-slate-400 font-medium">Toplam Öğrenci</span>
                <p className="text-2xl font-bold text-slate-800 mt-1">142</p>
                <span className="text-[10px] text-slate-500">89 ÇAP / 53 YDP Kayıtlı</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] text-amber-600 font-medium">Bekleyen Onay</span>
                <p className="text-2xl font-bold text-amber-600 mt-1">14</p>
                <span className="text-[10px] text-slate-500">Evrak / İntibak Onayı</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] text-blue-600 font-medium">Bu Yıl Yeni Başvuru</span>
                <p className="text-2xl font-bold text-blue-600 mt-1">28</p>
                <span className="text-[10px] text-slate-500">21 ÇAP / 7 YDP Başvuru</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] text-red-600 font-medium">Kritik Sınır (İlişik Kesme)</span>
                <p className="text-2xl font-bold text-red-600 mt-1">3</p>
                <span className="text-[10px] text-red-500 font-medium">2.50 GANO Altında Riskli</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] text-purple-600 font-medium">Bölüm ÇAP GANO Ort.</span>
                <p className="text-2xl font-bold text-purple-700 mt-1">3.54 <span className="text-xs font-normal text-slate-400">/ 4.00</span></p>
                <span className="text-[10px] text-slate-500">Fakülte Ort. Üstünde</span>
              </div>
            </div>

            {/* İşlem ve Denetim Modülleri */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">İşlem ve Denetim Yetki Modülleri</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-lg">⚖️</span>
                  <h4 className="font-bold text-xs text-slate-800">Ders Onayları & Harf Notu Denetimi</h4>
                  <p className="text-[11px] text-slate-500">Koordinatörün onayladığı ders intibaklarını, harf notlarını ve muafiyet gerekçelerini denetleme.</p>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1">İncele & İzle ➔</button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-lg">📑</span>
                  <h4 className="font-bold text-xs text-slate-800">Müfredat & Ders Planı Müdahaleleri</h4>
                  <p className="text-[11px] text-slate-500">Senato kararına aykırı veya eksik AKTS içeren ders protokollerini inceleme ve geri gönderme.</p>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1">İncele & İzle ➔</button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-lg">📂</span>
                  <h4 className="font-bold text-xs text-slate-800">Evrak, Transkript & Protokol Görüntüleyici</h4>
                  <p className="text-[11px] text-slate-500">Öğrencilerin teslim ettiği resmi transkript belgelerini ve koordinatörün kilitlediği intibak kütüğünü görüntüleme.</p>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1">İncele & İzle ➔</button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-lg">🔒</span>
                  <h4 className="font-bold text-xs text-slate-800">Kayıt Düzeltmeleri & Gerekçeli İptaller</h4>
                  <p className="text-[11px] text-slate-500">Kilitlenmiş protokolleri acil durumlarda açma, revize talebi oluşturma veya yanlış kayıtları iptal etme.</p>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1">İncele & İzle ➔</button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-lg">🎓</span>
                  <h4 className="font-bold text-xs text-slate-800">Mezuniyet, Sertifika & Kurul Kararları</h4>
                  <p className="text-[11px] text-slate-500">135 AKTS'yi tamamlayan öğrencilerin mezuniyet intibak onayını Fakülte Yönetim Kuruluna (FYK) sevk etme.</p>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1">İncele & İzle ➔</button>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-lg">⚙️</span>
                  <h4 className="font-bold text-xs text-slate-800">Dinamik Yönerge & Kural Değişiklikleri</h4>
                  <p className="text-[11px] text-slate-500">2.72 mezuniyet barajı ve 2.50 ilişik kesme tolerans parametrelerini yönetmelik güncellemelerine göre yapılandırma.</p>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 pt-1">İncele & İzle ➔</button>
                </div>
              </div>
            </div>

            {/* SİSTEM DENETİM KÜTÜĞÜ (AUDIT LOG CANLI AKIŞI) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    <span>🛡️</span> Silinmez Sistem Denetim Kütüğü (Audit Log Canlı Akışı)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Sistemde koordinatör ve öğrenciler tarafından yapılan tüm veri ve kilit işlemleri kriptografik zaman damgasıyla kaydedilir.</p>
                </div>
                <button onClick={fetchData} className="px-3 py-1 bg-white border rounded text-xs font-semibold hover:bg-slate-50">
                  ↻ Yenile
                </button>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b">
                    <th className="p-3">ID</th>
                    <th className="p-3">Zaman</th>
                    <th className="p-3">İşlemi Yapan</th>
                    <th className="p-3">Eylem Türü</th>
                    <th className="p-3">Detay ve Gerekçe</th>
                    <th className="p-3">IP Adresi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.length > 0 ? (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-500">#{log.id}</td>
                        <td className="p-3 text-slate-600">{new Date(log.timestamp).toLocaleTimeString("tr-TR")}</td>
                        <td className="p-3 font-sans font-bold text-slate-800">{log.performedBy}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === "PROTOCOL_APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            log.action === "COURSE_ADDED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                            log.action === "COURSE_DELETED" ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-slate-700">{log.details}</td>
                        <td className="p-3 text-slate-400">{log.ipAddress}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center font-sans text-slate-400">Henüz denetim kaydı bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KOORDİNATÖR PANELİ */}
        {role === "KOORDINATOR" && student && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-full">Koordinatör Masası</span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Ders ve Müfredat Bilgilerini Güncelleme</h2>
                <p className="text-xs text-slate-500">
                  Öğrenci: <b className="text-slate-800">{student.fullName}</b> ({student.studentNumber}) • {student.majorDepartment} ➔ {student.doubleMajorDepartment}
                </p>
              </div>
              <button
                disabled={student.isCapApproved}
                onClick={handleApprove}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm ${
                  student.isCapApproved ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {student.isCapApproved ? "✓ Protokol Onaylandı & Kilitlendi" : "Müfredat Değişikliklerini Kaydet ve Onayla"}
              </button>
            </div>

            {!student.isLocked && (
              <form onSubmit={handleAddCourse} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end text-xs">
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Ders Kodu</label>
                    <input type="text" placeholder="Örn: 3301351" value={cCode} onChange={e => setCCode(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="font-semibold text-slate-600 block mb-1">Ders Adı</label>
                    <input type="text" placeholder="Örn: NESNEYE YÖNELİK PROGRAMLAMA" value={cName} onChange={e => setCName(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">Dönem Seçimi</label>
                    <select value={cSemester} onChange={e => setCSemester(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500 bg-white font-medium">
                      {DONEMLER.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">AKTS</label>
                    <input type="number" min="1" max="30" value={cAkts} onChange={e => setCAkts(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 block mb-1">İntibak Türü</label>
                    <select value={cStatus} onChange={e => setCStatus(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500 bg-white">
                      <option value="Alinacak">Alınacak (Zorunlu)</option>
                      <option value="Muaf">Muaf (Sayılacak)</option>
                    </select>
                  </div>
                  {cStatus === "Muaf" && (
                    <div className="md:col-span-6 mt-1">
                      <label className="font-semibold text-slate-600 block mb-1">Muafiyet Gerekçesi</label>
                      <input type="text" placeholder="Eşdeğer sayılan anadal dersi" value={cReason} onChange={e => setCReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:border-blue-500" />
                    </div>
                  )}
                  <div className="md:col-span-6 flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition shadow-sm">
                      + Dersi Protokole Ekle
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b">
                    <th className="p-3">Dönem</th>
                    <th className="p-3">Ders Kodu</th>
                    <th className="p-3">Ders Adı</th>
                    <th className="p-3">AKTS</th>
                    <th className="p-3">İntibak Durumu</th>
                    {!student.isLocked && <th className="p-3 text-right">İşlem</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {student.courses.map((course) => (
                    <tr key={course.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-500">{course.semesterTaken || "2025-2026 Bahar"}</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">{course.courseCode}</td>
                      <td className="p-3 font-medium text-slate-900">{course.courseName}</td>
                      <td className="p-3">{course.akts}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${course.status === "Muaf" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                          {course.status} {course.exemptionReason ? `(${course.exemptionReason})` : ""}
                        </span>
                      </td>
                      {!student.isLocked && (
                        <td className="p-3 text-right">
                          <button onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:text-red-800 font-semibold">Kaldır</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ÖĞRENCİ PANELİ */}
        {role === "OGRENCI" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap justify-between items-center gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">Aktif Dönem: {seciliDonem}</span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">Dönemlik Ders ve Not Durumu</h2>
                <p className="text-xs text-slate-500 mt-1">Öğrenci: Merve Öztürk (2133011045)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Dönem:</span>
                <select value={seciliDonem} onChange={e => setSeciliDonem(e.target.value)} className="px-3 py-1.5 text-xs border rounded-lg bg-slate-50 font-bold text-blue-900 outline-none">
                  {DONEMLER.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b">
                    <th className="p-3">Ders Kodu & Adı</th>
                    <th className="p-3">AKTS</th>
                    <th className="p-3">Harf Notu</th>
                    <th className="p-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrelenmisDersler.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-medium text-slate-800">{item.courseCode} {item.courseName}</td>
                      <td className="p-3">{item.akts}</td>
                      <td className="p-3 font-bold">{item.grade || "Devam"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {item.status === "Muaf" ? "MUAF" : "KAYITLI"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ALT FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center text-[11px] text-slate-400 gap-2">
          <p>© 2026 Üniversite Bilgi Yönetim Sistemi (ABYS) • Bölüm Başkanlığı, ÇAP/YDP Koordinatörlük ve Denetim Modülü</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Sürüm v3.4.1 (Kurumsal)</span>
            <span className="hover:text-slate-600 cursor-pointer">Mevzuat Kılavuzu</span>
            <span className="hover:text-slate-600 cursor-pointer">BT Destek</span>
          </div>
        </div>
      </footer>
    </div>
  );
}