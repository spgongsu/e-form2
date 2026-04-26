/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Notice, ResponseData } from "../types";
import { cn, formatDate } from "../lib/utils";

interface Props {
  notice: Notice;
  response: ResponseData;
  isPrintMode?: boolean;
}

export default function PrintTemplate({ notice, response, isPrintMode = false }: Props) {
  return (
    <div 
      id="printable-area"
      className={cn(
        "relative flex flex-col bg-white p-[20mm] text-gray-900 border",
        isPrintMode ? "h-full w-full" : "mx-auto w-[210mm] min-h-[296mm]"
      )}
      style={{ boxSizing: "border-box" }}
    >
      {/* Title */}
      <h1 className="mb-8 text-center text-4xl font-extrabold tracking-tight border-b-4 border-black pb-4">
        가 정 통 신 문
      </h1>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 gap-6 overflow-hidden">
        <h2 className="text-2xl font-bold text-center underline underline-offset-8">
          {notice.title}
        </h2>

        {/* Original Notice Image (Main Image) */}
        {notice.imageUrl && (
          <div className="flex justify-center bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
            <img 
              src={notice.imageUrl} 
              alt="Notice Content" 
              className="max-h-[130mm] w-full object-contain"
            />
          </div>
        )}

        {/* Text Content */}
        <div className="whitespace-pre-wrap text-lg leading-relaxed text-gray-700 p-4 bg-gray-50/50 rounded-lg">
          {notice.content}
        </div>
      </div>

      {/* Bottom Section: Response & Signature */}
      <div className="mt-8 border-t-2 border-black pt-8 space-y-6">
        <div className="grid grid-cols-2 gap-8 bg-gray-50 p-6 rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500 uppercase">기재 사항</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            <div className="space-y-3">
              <p className="text-lg"><strong>학적:</strong> {response.children.map(c => `${c.grade}학년 ${c.name}`).join(", ")}</p>
              <p className="text-lg"><strong>학부모:</strong> {response.parentName} (관계: {response.relation})</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-500 uppercase">응답 결과</span>
              <div className="h-px flex-1 bg-gray-200"></div>
            </div>
            <div className="flex items-center justify-center h-16 rounded-xl bg-white border-2 border-blue-500 text-2xl font-black text-blue-600">
              {response.response}
            </div>
          </div>
        </div>

        {/* Signature Box */}
        <div className="flex items-end justify-between px-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">{formatDate(response.createdAt)}</p>
            <p className="text-xl font-bold">학부모 {response.parentName} (서명)</p>
          </div>
          <div className="relative flex items-center justify-center w-40 h-24 border-b-2 border-gray-300">
             {response.signatureUrl ? (
               <img src={response.signatureUrl} alt="Signature" className="h-full w-full object-contain" />
             ) : (
               <span className="text-xs text-gray-300">서명 없음</span>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-3xl font-black tracking-[0.5em] mt-10">상평초등학교장 귀하</p>
        </div>
      </div>
    </div>
  );
}
