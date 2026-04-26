/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Notice } from "../types";
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
  FileText
} from "lucide-react";
import { motion } from "motion/react";
import { cn, formatDate } from "../lib/utils";

interface Props {
  onCreate: () => void;
  onViewResults: (id: string) => void;
  onEdit: (id: string) => void;
}

export default function TeacherNoticeList({ onCreate, onViewResults, onEdit }: Props) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice));
      setNotices(data);
      setLoading(false);
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
    n.content.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          총 {filteredNotices.length}건의 안내장
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
                <th className="px-6 py-4">등록일</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm italic-none">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-1/2"></div></td>
                  </tr>
                ))
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <FileText className="h-8 w-8 mb-2 opacity-20" />
                      검색된 안내장이 없습니다.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNotices.map((notice) => (
                  <tr key={notice.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                          {notice.imageUrl ? (
                            <img src={notice.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <FileText size={18} />
                            </div>
                          )}
                        </div>
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {notice.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight",
                        notice.status === "open" 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-slate-100 text-slate-500"
                      )}>
                        {notice.status === "open" ? "진행 중" : "마감"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {formatDate(notice.createdAt).split(" ")[0]}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <ActionButton 
                          icon={<BarChart3 size={14} />} 
                          title="결과 확인"
                          onClick={() => onViewResults(notice.id)} 
                        />
                        <ActionButton 
                          icon={<Copy size={14} />} 
                          title="링크 복사"
                          onClick={() => copyLink(notice.id)} 
                        />
                        <ActionButton 
                          icon={<Edit3 size={14} />} 
                          title="수정"
                          onClick={() => onEdit(notice.id)} 
                        />
                        <ActionButton 
                          icon={<Trash2 size={14} />} 
                          title="삭제"
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

      {/* Stats Section from Theme */}
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
    </div>
  );
}

function ActionButton({ icon, onClick, title, variant = "default" }: { icon: React.ReactNode, onClick: () => void, title: string, variant?: "default" | "danger" }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 border rounded-md transition-all active:scale-90",
        variant === "danger" 
          ? "text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50" 
          : "text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 bg-white"
      )}
    >
      {icon}
    </button>
  );
}
