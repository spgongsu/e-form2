/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, FormEvent } from "react";
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
  Send,
  Plus,
  X,
  ZoomIn
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
  const [showImageModal, setShowImageModal] = useState(false);

  // Form states
  const [children, setChildren] = useState([{ grade: "", name: "" }]);
  const [parentName, setParentName] = useState("");
  const [relation, setRelation] = useState("부");
  const [response, setResponse] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("");

  const addChild = () => {
    setChildren([...children, { grade: "", name: "" }]);
  };

  const removeChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const updateChild = (index: number, field: "grade" | "name", value: string) => {
    const nextArr = [...children];
    nextArr[index][field] = value;
    setChildren(nextArr);
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!notice || !signatureUrl) return;

    setSubmitting(true);
    try {
      const responseData: Partial<ResponseData> = {
        noticeId: formId,
        children,
        parentName,
        relation,
        response,
        signatureUrl,
        createdAt: Date.now()
      };

      // 1. Save to Firestore (Wait for this)
      await addDoc(collection(db, "responses"), responseData);

      // 2. Try PDF/GAS in background (Don't let it block success UI)
      const tryProcessPdf = async () => {
        if (!settings?.gasUrl || !settings.gasUrl.startsWith("http") || !printableRef.current) return;
        
        try {
          const fileNameBase = children.map(c => `${c.grade}학년_${c.name}`).join("_");
          const element = printableRef.current;
          const opt = {
            margin: 0,
            filename: `${fileNameBase}_가정통신문.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          // Generate PDF
          const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
          
          // Blob to Base64
          const reader = new FileReader();
          reader.readAsDataURL(pdfBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            const pureBase64 = base64data.split(',')[1];

            try {
              await fetch(settings.gasUrl!, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({
                  fileName: `${notice.title}_${fileNameBase}.pdf`,
                  folderId: settings.driveFolderId,
                  fileData: pureBase64
                })
              });
            } catch (err) {
              console.warn("GAS Submission failed (Silent)", err);
            }
          };
        } catch (err) {
          console.warn("PDF generation failed (Silent)", err);
        }
      };

      tryProcessPdf();

      // 3. Set success state
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Submission error:", err);
      alert("제출 중 오류가 발생했습니다! (DB 저장 실패)");
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
          {children.map(c => c.name).join(", ")} 학생의 안내장이 학교로 안전하게 전송되었습니다.<br />
          소중한 응답 감사드립니다.
        </p>
        <div className="mt-10 text-[10px] text-gray-300">e-가정통신문 System</div>
      </div>
    );
  }

  // Handle closed notice
  if (notice.status === "closed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="mb-6 rounded-3xl bg-white p-10 shadow-xl border border-slate-200 max-w-md w-full">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
            <Lock className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">수신 만료된 안내장입니다</h2>
          <p className="mt-4 text-slate-500 leading-relaxed font-medium">
            해당 안내장은 접수가 마감되었거나 종료되었습니다.<br />
            문의사항은 학교로 연락 부탁드립니다.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
             <FileText className="h-4 w-4" />
             <span className="text-xs font-bold uppercase tracking-widest">{notice.title}</span>
          </div>
        </div>
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
              <div className="relative group cursor-pointer" onClick={() => setShowImageModal(true)}>
                <img src={notice.imageUrl} alt="Notice Content" className="w-full transition-transform duration-500 hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="bg-white/90 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100 shadow-lg">
                    <ZoomIn className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-md">
                   클릭하여 크게보기
                </div>
              </div>
              {notice.content && (
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-gray-900">안내 사항</h5>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 leading-relaxed font-bold">
                        {notice.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Section: Student Info */}
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-1.5 bg-blue-600 rounded-full"></div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight">인적 사항 입력</h4>
              </div>
              <button 
                type="button"
                onClick={addChild}
                className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
                title="형제자매 추가"
              >
                <Plus className="h-3 w-3" />
                추가
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {children.map((child, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={idx} 
                    className="relative group p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100/50 space-y-4"
                  >
                    {children.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => removeChild(idx)}
                        className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 p-1 rounded-full shadow-sm border border-gray-100 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-blue-800 uppercase tracking-wider ml-1">자녀 학년</label>
                        <select 
                          required
                          value={child.grade}
                          onChange={(e) => updateChild(idx, "grade", e.target.value)}
                          className="w-full rounded-xl bg-white border border-blue-100 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                        >
                          <option value="">선택</option>
                          {[1,2,3,4,5,6].map(g => <option key={g} value={String(g)}>{g}학년</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-blue-800 uppercase tracking-wider ml-1">자녀명</label>
                        <input 
                          required
                          type="text"
                          placeholder="성명 입력"
                          value={child.name}
                          onChange={(e) => updateChild(idx, "name", e.target.value)}
                          className="w-full rounded-xl bg-white border border-blue-100 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-blue-800 uppercase tracking-wider ml-1">관계</label>
                <select 
                  required
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full rounded-xl bg-white border border-blue-100 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                >
                  <option value="부">부</option>
                  <option value="모">모</option>
                  <option value="조부모">조부모</option>
                  <option value="외조부모">외조부모</option>
                  <option value="친척">친척</option>
                  <option value="보호자">보호자</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-blue-800 uppercase tracking-wider ml-1">학부모 성명</label>
                <input 
                  required
                  type="text"
                  placeholder="성명 입력"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full rounded-xl bg-white border border-blue-100 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-300"
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
                <div key={i}>
                  <OptionButton 
                    active={response === opt} 
                    label={opt} 
                    onClick={() => setResponse(opt)} 
                    color={i === 1 ? "red" : "blue"}
                  />
                </div>
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
            disabled={submitting || children.some(c => !c.grade || !c.name) || !parentName || !signatureUrl || !response}
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
              children,
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
      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.button
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-6 right-6 text-white bg-white/20 p-3 rounded-full backdrop-blur-md"
            >
              <X className="h-6 w-6" />
            </motion.button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={notice.imageUrl || ""} 
              className="max-h-full max-w-full rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
