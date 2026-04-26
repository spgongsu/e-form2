/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, ReactNode } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Notice, ResponseData } from "../types";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  ExternalLink, 
  BarChart3, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  Lock,
  Unlock,
  ZoomIn
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDateSimple } from "../lib/utils";

interface Props {
  onCreate: () => void;
  onViewResults: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function TeacherNoticeList({ onCreate, onViewResults, onEdit }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [responseStats, setResponseStats] = useState<Record<string, { positive: number, negative: number }>>({});

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
      setNotices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "responses"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stats: Record<string, { positive: number, negative: number }> = {};
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as ResponseData;
        if (!data.noticeId) return;
        
        if (!stats[data.noticeId]) {
          stats[data.noticeId] = { positive: 0, negative: 0 };
        }
        
        // 긍정적 키워드로 판별
        const resValue = data.response;
        const isPositive = resValue.includes("동의") || 
                           resValue.includes("참여") || 
                           resValue.includes("참가") ||
                           resValue === "네" ||
                           resValue.includes("희망");
                           
        if (isPositive) stats[data.noticeId].positive++;
        else stats[data.noticeId].negative++;
      });
      setResponseStats(stats);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("정말로 이 안내장을 삭제하시겠습니까? 관련 데이터가 모두 삭제됩니다.")) {
      try {
        await deleteDoc(doc(db, "notices", id));
      } catch (e) {
        console.error("Delete failed", e);
      }
    }
  };

  const toggleStatus = async (notice: Notice) => {
    const newStatus = notice.status === "open" ? "closed" : "open";
    await updateDoc(doc(db, "notices", notice.id), { status: newStatus });
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?formId=${id}`;
    navigator.clipboard.writeText(url);
    alert("공유 링크가 복사되었습니다.");
  };

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search and Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="안내장 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
          TOTAL {filteredNotices.length}
        </div>
      </div>

      {/* Notice Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">제목</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4 text-center">응답 현황</th>
                <th className="px-6 py-4">등록일</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                  </tr>
                ))
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 mb-2 opacity-20" />
                      검색된 안내장이 없습니다.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNotices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3">
                      <button 
                        onClick={() => notice.imageUrl && setPreviewImage(notice.imageUrl)}
                        className="flex items-center gap-3 text-left outline-none group/title"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 relative">
                          {notice.imageUrl ? (
                            <>
                              <img src={notice.imageUrl} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/title:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <FileText size={18} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn(
                            "font-bold text-slate-900 group-hover/title:text-blue-600 transition-colors truncate max-w-[200px]",
                            notice.imageUrl && "underline decoration-slate-200 underline-offset-4 decoration-2"
                          )}>
                            {notice.title}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 uppercase font-bold tracking-tight">
                            {notice.responseType === "agree_disagree" && "동의 확인"}
                            {notice.responseType === "participate_absent" && "참여 조사"}
                            {notice.responseType === "direct_input" && "사용자 정의"}
                          </span>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
                        notice.status === "open" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-red-100 text-red-700"
                      )}>
                        {notice.status === "open" ? "진행" : "마감"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-black text-blue-600 tabular-nums">
                          {responseStats[notice.id]?.positive || 0}
                        </span>
                        <span className="text-slate-200 font-normal">/</span>
                        <span className="text-sm font-black text-red-600 tabular-nums">
                          {responseStats[notice.id]?.negative || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 font-mono text-xs">
                      {formatDateSimple(notice.createdAt)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <ActionButton 
                          icon={<BarChart3 size={13} />} 
                          label="결과"
                          onClick={() => onViewResults(notice.id)} 
                        />
                        <ActionButton 
                          icon={<Copy size={13} />} 
                          label="복사"
                          onClick={() => copyLink(notice.id)} 
                        />
                        <ActionButton 
                          icon={notice.status === "open" ? <Lock size={13} /> : <Unlock size={13} />} 
                          label={notice.status === "open" ? "마감" : "재개"}
                          variant={notice.status === "open" ? "danger" : "success"}
                          onClick={() => toggleStatus(notice)} 
                        />
                        <div className="w-px h-6 bg-slate-200 mx-0.5 self-center" />
                        <ActionButton 
                          icon={<Edit3 size={13} />} 
                          onClick={() => onEdit(notice.id)} 
                        />
                        <ActionButton 
                          icon={<Trash2 size={13} />} 
                          variant="danger" 
                          onClick={() => handleDelete(notice.id)} 
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">전체 안내장 수</p>
            <h4 className="text-2xl font-bold mt-1 text-slate-800">{notices.length}</h4>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">진행 중인 안내장</p>
            <h4 className="text-2xl font-bold mt-1 text-emerald-600">
              {notices.filter(n => n.status === "open").length}
            </h4>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-h-full max-w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2 font-bold"
              >
                닫기 <X className="w-6 h-6" />
              </button>
              <img src={previewImage} className="max-h-full max-w-full rounded-lg shadow-2xl" alt="Preview" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ icon, onClick, title, label, variant = "default" }: { icon: ReactNode, onClick: () => void, title?: string, label?: string, variant?: "default" | "danger" | "success" }) {
  const baseClasses = "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all active:scale-90 font-bold text-[11px] outline-none";
  const variants = {
    default: "text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white",
    danger: "text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 bg-white",
    success: "text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 bg-white"
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(baseClasses, variants[variant])}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
