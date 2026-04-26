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
  Image as ImageIcon
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion } from "motion/react";
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
        </div>
      </div>

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
