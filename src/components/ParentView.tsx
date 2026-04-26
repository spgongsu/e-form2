/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Notice, ResponseData, Settings } from "../types";
import { 
  FileText, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Info,
  Calendar,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import html2pdf from "html2pdf.js";
import { cn } from "../lib/utils";
import SignatureCanvas from "./SignatureCanvas";
import PrintTemplate from "./PrintTemplate";

interface Props {
  formId: string;
}

export default function ParentView({ formId }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [grade, setGrade] = useState("");
  const [studentName, setStudentName] = useState("");
  const [parentName, setParentName] = useState("");
  const [relation, setRelation] = useState("부/모");
  const [response, setResponse] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const printableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const nDoc = await getDoc(doc(db, "notices", formId));
        if (nDoc.exists()) {
          const nData = { id: nDoc.id, ...nDoc.data() } as Notice;
          setNotice(nData);
          // Set default response
          if (nData.responseType === "agree_disagree") setResponse("동의함");
          else if (nData.responseType === "participate_absent") setResponse("참여함");
        }

        const sDoc = await getDoc(doc(db, "config", "settings"));
        if (sDoc.exists()) setSettings(sDoc.data() as Settings);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notice || !signatureUrl) return;

    setSubmitting(true);
    try {
      const responseData: Partial<ResponseData> = {
        noticeId: formId,
        grade,
        studentName,
        parentName,
        relation,
        response,
        signatureUrl,
        createdAt: Date.now()
      };

      // 1. Save to Firestore
      await addDoc(collection(db, "responses"), responseData);

      // 2. Generate PDF and send to GAS
      if (settings?.gasUrl && printableRef.current) {
        const element = printableRef.current;
        const opt = {
          margin: 0,
          filename: `${studentName}_가정통신문.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Convert to Blob
        const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const pureBase64 = base64data.split(',')[1];

          // Send to GAS
          try {
            await fetch(settings.gasUrl, {
              method: "POST",
              mode: "no-cors", // Required for GAS sometimes, but text/plain is safer for CORS
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                fileName: `${notice.title}_${grade}학년_${studentName}.pdf`,
                folderId: settings.driveFolderId,
                fileData: pureBase64
              })
            });
          } catch (gasError) {
            console.error("GAS transmission error", gasError);
          }
        };
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold">존재하지 않는 안내장입니다.</h2>
        <p className="mt-2 text-gray-500">URL을 다시 확인해주세요.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600"
        >
          <CheckCircle2 className="h-12 w-12" />
        </motion.div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">제출이 완료되었습니다!</h2>
        <p className="mt-4 text-gray-500 leading-relaxed">
          {studentName} 학생의 안내장이 학교로 안전하게 전송되었습니다.<br />
          소중한 응답 감사드립니다.
        </p>
        <div className="mt-10 text-[10px] text-gray-300">e-가정통신문 System</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans">
      {/* Header Overlay */}
      <div className="h-48 w-full bg-blue-600">
        <div className="mx-auto max-w-2xl px-6 pt-12 text-white">
          <div className="flex items-center gap-2 text-blue-100 opacity-80">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-bold tracking-widest uppercase">E-가정통신문</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl leading-tight">{notice.title}</h1>
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-2xl px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Notice Image */}
          {notice.imageUrl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-200/50"
            >
              <img src={notice.imageUrl} alt="Notice Content" className="w-full" />
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">전달 사항</h5>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 leading-relaxed">
                      {notice.content}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Section: Student Info */}
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-blue-600 rounded-full"></div>
              <h4 className="text-lg font-bold">인적 사항 입력</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">학년</label>
                <select 
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                >
                  <option value="">선택</option>
                  {[1,2,3,4,5,6].map(g => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">학생명</label>
                <input 
                  required
                  type="text"
                  placeholder="성명 입력"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">관계</label>
                <input 
                  required
                  type="text"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder="예: 부, 모"
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">학부모 성명</label>
                <input 
                  required
                  type="text"
                  placeholder="성명 입력"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Response Selection */}
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-blue-600 rounded-full"></div>
              <h4 className="text-lg font-bold">응답 선택</h4>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {notice.responseType === "agree_disagree" && (
                <>
                  <OptionButton active={response === "동의함"} label="동의함" onClick={() => setResponse("동의함")} />
                  <OptionButton active={response === "미동의"} label="미동의" onClick={() => setResponse("미동의")} color="red" />
                </>
              )}
              {notice.responseType === "participate_absent" && (
                <>
                  <OptionButton active={response === "참여함"} label="참여함" onClick={() => setResponse("참여함")} />
                  <OptionButton active={response === "불참함"} label="불참함" onClick={() => setResponse("불참함")} color="red" />
                </>
              )}
              {notice.responseType === "direct_input" && notice.customOptions?.map((opt, i) => (
                <OptionButton 
                  key={i} 
                  active={response === opt} 
                  label={opt} 
                  onClick={() => setResponse(opt)} 
                  color={i === 1 ? "red" : "blue"}
                />
              ))}
            </div>
          </div>

          {/* Section: Signature */}
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 bg-blue-600 rounded-full"></div>
              <h4 className="text-lg font-bold">학부모 전자 서명</h4>
            </div>
            <SignatureCanvas onSave={setSignatureUrl} onClear={() => setSignatureUrl("")} />
            <p className="text-center text-[10px] text-gray-400">
              위 전자 서명은 실제 인감과 동일한 법적 효력을 가짐에 동의합니다.
            </p>
          </div>

          {/* Submit Button */}
          <button
            disabled={submitting || !grade || !studentName || !parentName || !signatureUrl || !response}
            type="submit"
            className="group flex w-full items-center justify-center gap-3 rounded-[2rem] bg-blue-600 py-6 text-xl font-black text-white shadow-2xl shadow-blue-300 transition-all hover:bg-blue-700 active:scale-95 disabled:grayscale disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Send className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                안내장 제출하기
              </>
            )}
          </button>
        </form>
      </div>

      {/* Hidden Downloadable Template */}
      <div className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden">
        <div ref={printableRef}>
          <PrintTemplate 
            notice={notice} 
            response={{
              grade,
              studentName,
              parentName,
              relation,
              response,
              signatureUrl,
              createdAt: Date.now(),
              id: "", noticeId: ""
            }}
            isPrintMode={true}
          />
        </div>
      </div>
    </div>
  );
}

function OptionButton({ active, label, onClick, color = "blue" }: { active: boolean, label: string, onClick: () => void, color?: "blue" | "red" }) {
  const activeClass = color === "blue" ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-red-600 text-white ring-4 ring-red-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 py-4 text-lg font-bold transition-all",
        active ? activeClass : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-white hover:border-gray-200"
      )}
    >
      {label}
      {active && (
        <motion.div layoutId="check" className="ml-2">
          <CheckCircle2 className="h-5 w-5" />
        </motion.div>
      )}
    </button>
  );
}
