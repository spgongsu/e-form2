/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Notice } from "../types";
import { 
  X, 
  Image as ImageIcon, 
  Type, 
  CheckCircle2, 
  Save, 
  Loader2,
  Trash2
} from "lucide-react";
import imageCompression from "browser-image-compression";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface Props {
  noticeId: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function TeacherNoticeForm({ noticeId, onCancel, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [responseType, setResponseType] = useState<Notice["responseType"]>("agree_disagree");
  const [customOptions, setCustomOptions] = useState<string[]>(["필요시 추가1", "필요시 추가2"]);

  useEffect(() => {
    if (noticeId) {
      const fetchNotice = async () => {
        const d = await getDoc(doc(db, "notices", noticeId));
        if (d.exists()) {
          const data = d.data() as Notice;
          setTitle(data.title);
          setContent(data.content);
          setImageUrl(data.imageUrl);
          setResponseType(data.responseType);
          if (data.customOptions) setCustomOptions(data.customOptions);
        }
      };
      fetchNotice();
    }
  }, [noticeId]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      
      // Since we don't have a storage backend configured for this demo easily without setup,
      // and we want to keep it simple, we'll convert to Base64 for now.
      // In production, use Firebase Storage.
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setLoading(false);
      };
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setLoading(true);
    try {
      const data = {
        title,
        content,
        imageUrl,
        responseType,
        customOptions: responseType === "direct_input" ? customOptions : null,
        status: "open",
        updatedAt: Date.now(),
        authorId: auth.currentUser?.uid || "admin",
      };

      if (noticeId) {
        await updateDoc(doc(db, "notices", noticeId), data);
      } else {
        await addDoc(collection(db, "notices"), {
          ...data,
          createdAt: Date.now(),
        });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
      <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-800">
            {noticeId ? "안내장 수정" : "새 안내장 작성"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">학부모님께 보낼 공문 양식을 구성하세요.</p>
        </div>
        <button onClick={onCancel} className="rounded-lg p-2 hover:bg-slate-100 text-slate-400 transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Title Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">안내장 제목</label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 현장체험학습 참가 신청서"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {/* Image Upload Section - Moved under Title */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">안내장 이미지 등록</label>
          <div 
            className={cn(
              "relative aspect-[3/4] max-w-md mx-auto flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all",
              imageUrl 
              ? "border-slate-200 bg-slate-50" 
              : "border-slate-200 bg-slate-100/50 hover:border-blue-300 hover:bg-blue-50/30"
            )}
          >
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="Preview" className="h-full w-full object-contain p-2" />
                <button 
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute right-4 top-4 rounded-full bg-slate-800/80 p-2 text-white hover:bg-slate-900 shadow-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center p-6 text-center">
                <div className="mb-4 rounded-xl bg-white p-4 shadow-sm border border-slate-100">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-800">안내장 이미지 업로드</p>
                <p className="mt-1 text-[11px] text-slate-500">사진을 클릭하거나 끌어오세요</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}
          </div>
        </div>

        {/* Extra Info Section - Repurposed from Content */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">선택사항 (추가 안내사항 및 강조사항)</label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="학부모님께 강조하고 싶은 내용이나 추가 안내사항이 있으면 입력하세요. (비워두면 나타나지 않습니다)"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {/* Response Type Section */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">응답 유형</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TypeSelector 
              active={responseType === "agree_disagree"} 
              label="동의 / 미동의" 
              onClick={() => setResponseType("agree_disagree")}
            />
            <TypeSelector 
              active={responseType === "participate_absent"} 
              label="참여 / 불참" 
              onClick={() => setResponseType("participate_absent")}
            />
            <TypeSelector 
              active={responseType === "direct_input"} 
              label="사용자 정의" 
              onClick={() => setResponseType("direct_input")}
            />
          </div>
          
          {responseType === "direct_input" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 border border-slate-100"
            >
              <label className="text-xs font-bold text-slate-500">옵션 설정</label>
              {customOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input 
                    type="text" 
                    value={opt}
                    onChange={(e) => {
                      const next = [...customOptions];
                      next[i] = e.target.value;
                      setCustomOptions(next);
                    }}
                    className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                  />
                  {customOptions.length > 2 && (
                    <button type="button" onClick={() => setCustomOptions(customOptions.filter((_, idx) => idx !== i))} className="p-1.5 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button"
                onClick={() => setCustomOptions([...customOptions, ""])}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 mt-2"
              >
                + 옵션 추가
              </button>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 flex gap-3 border-t border-slate-100">
          <button
            onClick={onCancel}
            type="button"
            className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            취소
          </button>
          <button
            disabled={loading || !title}
            type="submit"
            className="flex-[2] flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {noticeId ? "안내장 수정 완료" : "안내장 발행하기"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TypeSelector({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
        active 
          ? "border-blue-500 bg-blue-50 shadow-sm" 
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
        active ? "border-blue-500 bg-blue-500" : "border-slate-300"
      )}>
        {active && <CheckCircle2 className="h-3 w-3 text-white" />}
      </div>
      <span className={cn("text-sm font-bold", active ? "text-blue-700" : "text-slate-700")}>{label}</span>
    </button>
  );
}
