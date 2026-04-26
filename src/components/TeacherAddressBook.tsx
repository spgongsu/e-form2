/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, ChangeEvent } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { Student } from "../types";
import { 
  Users, 
  UserPlus, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Search,
  Upload,
  AlertCircle,
  Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

export default function TeacherAddressBook() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // 1순위: 학년 낮은 순, 2순위: 학생 이름 순 (Sorted in app code as Firestore order is limited for multiple fields without index)
    const q = query(collection(db, "students"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      // Manual multi-sort for precision
      data.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        if (a.studentName !== b.studentName) return a.studentName.localeCompare(b.studentName);
        return 0;
      });
      setStudents(data);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("정말로 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "students", id));
    }
  };

  const downloadTemplate = () => {
    const data = [
      ["학년", "반", "학생성명", "학부모성명", "연락처(숫자만)"],
      ["1", "3", "홍길동", "홍부모", "01012345678"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "양식");
    XLSX.writeFile(wb, "주소록_업로드_양식.xlsx");
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const batch = writeBatch(db);
        data.forEach((row: any) => {
          const studentRef = doc(collection(db, "students"));
          batch.set(studentRef, {
            grade: String(row["학년"] || ""),
            class: String(row["반"] || ""),
            studentName: row["학생성명"] || "",
            parentName: row["학부모성명"] || "",
            phone: String(row["연락처(숫자만)"] || ""),
          });
        });
        await batch.commit();
        alert(`${data.length}명의 데이터가 업로드되었습니다.`);
      } catch (err) {
        console.error(err);
        alert("업로드 중 오류가 발생했습니다. 양식을 다시 확인해주세요.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredStudents = students.filter(s => 
    s.studentName.includes(searchTerm) || s.parentName.includes(searchTerm) || s.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="이름 또는 연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={downloadTemplate} 
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <Download className="h-4 w-4" />
            양식 받기
          </button>
          <div className="relative">
            <button 
              disabled={uploading} 
              className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  엑셀 업로드
                </>
              )}
            </button>
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="absolute inset-0 cursor-pointer opacity-0" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">학년/반</th>
                <th className="px-6 py-4">학생 성명</th>
                <th className="px-6 py-4">학부모 성명</th>
                <th className="px-6 py-4">연락처</th>
                <th className="px-6 py-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredStudents.map((s, idx) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  key={s.id} 
                  className="hover:bg-slate-50 group transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                      {s.grade}-{s.class}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-900">{s.studentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600">{s.parentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-mono text-xs">{s.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleDelete(s.id)} 
                      className="p-1.5 text-slate-400 hover:text-red-600 border border-transparent hover:border-red-100 rounded-md hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Users className="h-10 w-10 mb-2 opacity-10" />
                      데이터가 없습니다. 엑셀 파일을 업로드해주세요.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
