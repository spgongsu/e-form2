/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Notice {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  responseType: "agree_disagree" | "participate_absent" | "direct_input";
  customOptions?: string[];
  status: "open" | "closed";
  createdAt: number;
  authorId: string;
}

export interface Student {
  id: string;
  grade: string;
  class: string;
  studentName: string;
  parentName: string;
  phone: string;
}

export interface ResponseData {
  id: string;
  noticeId: string;
  studentId?: string;
  grade: string;
  studentName: string;
  parentName: string;
  relation: string;
  response: string; // "동의함", "참여함" 등
  signatureUrl: string; // Base64
  pdfUrl?: string; // Google Drive link after upload
  createdAt: number;
}

export interface Settings {
  gasUrl: string;
  driveFolderId: string;
  smsApiKey: string;
}
