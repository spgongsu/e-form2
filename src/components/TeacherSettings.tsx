/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Settings } from "../types";
import { Save, Server, ShieldCheck, Mail, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export default function TeacherSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gasUrl, setGasUrl] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [smsApiKey, setSmsApiKey] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const d = await getDoc(doc(db, "config", "settings"));
      if (d.exists()) {
        const data = d.data() as Settings;
        setGasUrl(data.gasUrl || "");
        setDriveFolderId(data.driveFolderId || "");
        setSmsApiKey(data.smsApiKey || "");
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "settings"), {
        gasUrl,
        driveFolderId,
        smsApiKey
      });
      alert("설정이 저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold">구글 드라이브 연동 (GAS)</h4>
            <p className="text-xs text-gray-500">PDF 파일을 자동으로 취합할 Google Apps Script 정보</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <h5 className="flex items-center gap-2 text-xs font-black text-blue-700 uppercase tracking-wider mb-2">
              <ShieldCheck className="h-3 w-3" />
              설정 가이드
            </h5>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-blue-600 font-medium">
              <li className="flex gap-1.5">
                <span className="shrink-0">•</span>
                <span><strong>GAS 배포 URL:</strong> 구글 시트 [확장 프로그램 &gt; Apps Script]에서 PDF 저장 스크립트 작성 후 [배포 &gt; 웹 앱]으로 발행한 URL입니다. (권한: 모든 사용자)</span>
              </li>
              <li className="flex gap-1.5">
                <span className="shrink-0">•</span>
                <span><strong>저장될 폴더 ID:</strong> 구글 드라이브에서 파일을 모을 폴더를 생성하고, 주소창URL의 <code>folders/</code> 뒷부분 문자열을 복사해서 입력하세요.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">GAS 배포 URL (Web App)</label>
            <input 
              type="text" 
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">저장될 폴더 ID</label>
            <input 
              type="text" 
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              placeholder="Google Drive 폴더 URL의 마지막 문자열"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold">자동 문자 발송 (SMS API)</h4>
            <p className="text-xs text-gray-500">알림톡 및 문자 연동 키 설정</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">솔라피/뿌리오 API Key</label>
            <input 
              type="password" 
              value={smsApiKey}
              onChange={(e) => setSmsApiKey(e.target.value)}
              placeholder="API Key를 입력하세요"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-bold text-white shadow-xl shadow-gray-200 transition-all hover:bg-black active:scale-95 disabled:opacity-50"
      >
        {saving ? <Loader2 className="animate-spin" /> : <Save className="h-5 w-5" />}
        환경설정 저장하기
      </button>
    </div>
  );
}
