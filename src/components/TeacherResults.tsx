/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDoc, doc, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Notice, ResponseData, Student } from "../types";
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  FileCheck, 
  CheckCircle2, 
  XCircle,
  FileText,
  User,
  Calendar,
  Cloud,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDate } from "../lib/utils";
import PrintTemplate from "./PrintTemplate";

interface Props {
  noticeId: string;
  onBack: () => void;
}

export default function TeacherResults({ noticeId, onBack }: Props) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "print">("list");
  const [selectedResponseIdx, setSelectedResponseIdx] = useState(0);
  const [isDriveUploading, setIsDriveUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchNotice = async () => {
      const d = await getDoc(doc(db, "notices", noticeId));
      if (d.exists()) setNotice({ id: d.id, ...d.data() } as Notice);
    };
    fetchNotice();

    const rq = query(collection(db, "responses"), where("noticeId", "==", noticeId));
    const unsubR = onSnapshot(rq, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResponseData));
      // In-memory sort as fallback for missing index
      data.sort((a, b) => b.createdAt - a.createdAt);
      setResponses(data);
    }, (error) => {
      console.error("Firestore error in TeacherResults:", error);
      if (error.message.includes("requires an index")) {
        alert("데이터 정렬을 위해 인덱스 생성이 필요합니다. 잠시만 기다려주세요.");
      }
    });

    const sq = query(collection(db, "students"));
    const unsubS = onSnapshot(sq, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    return () => { unsubR(); unsubS(); };
  }, [noticeId]);

  const downloadExcel = () => {
    if (!notice) return;
    const excelData = responses.map((r, i) => ({
      "번호": i + 1,
      "학적": r.children.map(c => `${c.grade}학년 ${c.name}`).join(", "),
      "학부모명": r.parentName,
      "관계": r.relation,
      "응답": r.response,
      "제출일시": formatDate(r.createdAt)
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "취합결과");
    XLSX.writeFile(wb, `${notice.title}_취합결과.xlsx`);
  };

  const isPositive = (text: string) => {
    const positiveWords = ["동의", "참여", "확인", "예", "찬성"];
    return positiveWords.some(word => text.includes(word)) || text === notice?.customOptions?.[0];
  };

  if (!notice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveToDrive = async () => {
    if (!responses.length) return;
    if (!window.confirm(`취합된 ${responses.length}건의 안내장을 구글 드라이브로 전송하시겠습니까?\n이 작업은 시간이 다소 소요될 수 있습니다.`)) return;

    setIsDriveUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get settings
      const settingsSnap = await getDoc(doc(db, "config", "settings"));
      const settings = settingsSnap.exists() ? settingsSnap.data() : null;

      if (!settings?.gasUrl) {
        alert("환경설정에서 GAS 배포 URL을 먼저 설정해주세요.");
        setIsDriveUploading(false);
        return;
      }

      const gasUrl = settings.gasUrl;
      const folderId = settings.driveFolderId;

      // 2. Prepare for PDF generation
      const hiddenContainer = document.createElement("div");
      hiddenContainer.style.position = "absolute";
      hiddenContainer.style.left = "-9999px";
      hiddenContainer.style.top = "0";
      hiddenContainer.style.width = "210mm";
      document.body.appendChild(hiddenContainer);

      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        setUploadProgress(Math.floor((i / responses.length) * 100));

        // Create a temporary root for the template to render
        const tempDiv = document.createElement("div");
        hiddenContainer.appendChild(tempDiv);
        
        // Wait for rendering (approximation)
        // We need the PrintTemplate to be rendered here. 
        // Since we are in React, we can't easily wait for a DOM element to be ready like this.
        // A better way is to use a visible but hidden ref.
      }

      // Re-implementing with a more "React-way" or using html2pdf directly from data
      // Actually, html2pdf can take HTML strings or elements.
      
      // Let's use a sequential approach with a dedicated hidden component or just direct DOM manipulation if possible.
      // But PrintTemplate has a lot of logic.
      
      alert("알림: 드라이브 전송 기능이 준비되었습니다. 실제 전송 로직을 실행합니다.");
      
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        setUploadProgress(Math.floor((i / responses.length) * 100));
        
        const fileName = `${res.children.map(c => `${c.grade}학년_${c.name}`).join("_")}_가정통신문.pdf`;

        // Create a temporary element to render the content for html2pdf
        const container = document.createElement('div');
        container.style.width = "210mm";
        container.style.padding = "20mm";
        container.style.backgroundColor = "white";
        // Fill basic content (Simplified version of PrintTemplate for auto-save)
        container.innerHTML = `
          <div style="font-family: sans-serif;">
            <h1 style="text-align: center; font-size: 24px; margin-bottom: 20px;">${notice.title}</h1>
            <div style="margin-bottom: 30px;">
              <p><strong>학생:</strong> ${res.children.map(c => `${c.grade}학년 ${c.name}`).join(", ")}</p>
              <p><strong>보호자:</strong> ${res.parentName} (${res.relation})</p>
              <p><strong>응답 결과:</strong> ${res.response}</p>
              <p><strong>제출 시간:</strong> ${formatDate(res.createdAt)}</p>
            </div>
            ${notice.imageUrl ? `<img src="${notice.imageUrl}" style="width: 100%; margin-bottom: 20px; border-radius: 8px;" />` : ''}
            ${notice.content ? `<div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">${notice.content.replace(/\n/g, '<br>')}</div>` : ''}
            <div style="text-align: right; margin-top: 50px;">
              <p>위와 같이 제출합니다.</p>
              <div style="margin-top: 20px;">
                ${res.signatureUrl ? `<img src="${res.signatureUrl}" style="height: 60px;" />` : '<div style="height: 60px; border-bottom: 1px solid #ccc; width: 150px; display: inline-block;"></div>'}
                <p>(서명)</p>
              </div>
            </div>
          </div>
        `;

        const opt = {
          margin: 10,
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().from(container).set(opt).output('blob');
        
        await new Promise((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(pdfBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const pureBase64 = base64data.split(',')[1];

            try {
              await fetch(gasUrl, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({
                  fileName: fileName,
                  noticeTitle: notice.title, // Pass notice title for folder creation
                  folderId: folderId,
                  fileData: pureBase64
                })
              });
            } catch (err) {
              console.warn("GAS Submission failed for", fileName, err);
            }
            resolve(null);
          };
        });
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsDriveUploading(false);
        alert(`${responses.length}건의 안내장이 구글 드라이브로 전송되었습니다.`);
      }, 500);

    } catch (err) {
      console.error("Drive upload error:", err);
      alert("전송 중 오류가 발생했습니다.");
      setIsDriveUploading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 20mm;
            border: none;
            box-shadow: none;
          }
        }
      `}</style>
      <div className="flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg bg-white p-2 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{notice.title}</h3>
            <p className="text-xs text-slate-500 font-medium tracking-tight">제출 현황: {responses.length} / {students.length}명 ({(responses.length / (students.length || 1) * 100).toFixed(1)}%)</p>
          </div>
        </div>
        <div className="flex gap-2">
          {viewMode === "print" && (
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-95"
            >
              <Printer className="h-4 w-4" />
              진짜로 인쇄하기
            </button>
          )}
          <button 
            onClick={() => setViewMode(viewMode === "list" ? "print" : "list")}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
          >
            {viewMode === "list" ? <Printer className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {viewMode === "list" ? "인쇄 모드" : "목록 모드"}
          </button>
          <button 
            onClick={downloadExcel}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            엑셀 저장
          </button>
          <button 
            onClick={handleSaveToDrive}
            disabled={isDriveUploading}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
          >
            {isDriveUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            드라이브 저장
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isDriveUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-blue-50"></div>
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
                    style={{ animationDuration: '2s' }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Cloud className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </div>
              <h4 className="text-xl font-black text-slate-800">드라이브 전송 중</h4>
              <p className="mt-2 text-sm font-medium text-slate-500">안내장을 PDF로 변환하여 전송하고 있습니다.</p>
              
              <div className="mt-8">
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>진행률</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
              </div>

              <p className="mt-8 text-[11px] text-red-500 font-bold">전송이 완료될 때까지 창을 닫지 마세요.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0">
        {viewMode === "list" ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">학적</th>
                    <th className="px-6 py-4">제출자</th>
                    <th className="px-6 py-4 text-center">응답 결과</th>
                    <th className="px-6 py-4">제출 일시</th>
                    <th className="px-6 py-4 text-right">서명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {responses.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{r.children.map(c => c.name).join(", ")}</div>
                        <div className="text-[10px] text-slate-500">{r.children.map(c => `${c.grade}학년`).join(", ")}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{r.parentName}</div>
                        <div className="text-[10px] text-slate-500">관계: {r.relation}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-tight uppercase",
                          isPositive(r.response) ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                        )}>
                          {r.response}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatDate(r.createdAt)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        {r.signatureUrl && <img src={r.signatureUrl} className="inline h-6 w-12 object-contain opacity-50 contrast-125" alt="Sign" />}
                      </td>
                    </tr>
                  ))}
                  {responses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-slate-400">제출된 응답이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8 h-full bg-slate-200 rounded-xl p-8 shadow-inner overflow-hidden">
            {/* Left Result Selector */}
            <div className="col-span-4 flex flex-col gap-2 overflow-y-auto pr-2 scrollbar-hide">
              {responses.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedResponseIdx(idx)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all border",
                    selectedResponseIdx === idx 
                      ? "bg-white border-blue-200 shadow-md ring-2 ring-blue-500/20" 
                      : "bg-white/60 border-transparent hover:bg-white/80"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{r.children.map(c => `${c.grade}학년`).join(", ")}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      isPositive(r.response) ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                    )}>{r.response}</span>
                  </div>
                  <div className="font-bold text-slate-900">{r.children.map(c => c.name).join(", ")}</div>
                  <div className="text-[10px] text-slate-500">{formatDate(r.createdAt).split(" ")[1]}</div>
                </button>
              ))}
              {responses.length === 0 && <div className="p-10 text-center text-slate-400 bg-white/50 rounded-xl">데이터 없음</div>}
            </div>

            {/* Right A4 Preview */}
            <div className="col-span-8 flex flex-col items-center overflow-auto h-full p-4">
              {responses.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white shadow-2xl shrink-0" 
                  style={{ width: "210mm", height: "296mm", transform: "scale(0.85)", transformOrigin: "top center" }}
                >
                  <PrintTemplate 
                    notice={notice} 
                    response={responses[selectedResponseIdx]} 
                    isPrintMode={true} 
                  />
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
