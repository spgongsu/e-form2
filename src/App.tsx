/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signInAnonymously, onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Loader2,
  ChevronRight,
  Menu,
  X
} from "lucide-react";

import TeacherNoticeList from "./components/TeacherNoticeList";
import TeacherNoticeForm from "./components/TeacherNoticeForm";
import TeacherAddressBook from "./components/TeacherAddressBook";
import TeacherResults from "./components/TeacherResults";
import TeacherSettings from "./components/TeacherSettings";
import ParentView from "./components/ParentView";
import { cn } from "./lib/utils";

type View = "notices" | "create_notice" | "address_book" | "results" | "settings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<View>("notices");
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);

  // Parse URL for formId
  const params = new URLSearchParams(window.location.search);
  const formId = params.get("formId");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        // If not logged in and it's parent view, login anonymously
        if (formId) {
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.error("Anonymous login failed", e);
          }
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [formId]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Login failed", e);
      if (e.code === "auth/unauthorized-domain") {
        setLoginError("이 도메인이 Firebase 승인 도메인에 등록되지 않았습니다. Firebase 콘솔에서 현재 URL을 '승인된 도메인'에 추가해주세요.");
      } else if (e.code === "auth/popup-blocked") {
        setLoginError("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용하거나 새 탭에서 앱을 열어주세요.");
      } else if (e.code === "auth/cancelled-popup-request") {
        setLoginError("로그인 팝업이 닫혔습니다. 다시 시도해주세요.");
      } else {
        setLoginError(`로그인 중 오류가 발생했습니다: ${e.message}`);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  // Parent View
  if (formId) {
    return <ParentView formId={formId} />;
  }

  // Teacher Login Page
  if (!user || user.isAnonymous) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl"
        >
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 font-sans">e-가정통신문</h1>
            <p className="mt-2 text-gray-500">교사용 관리 시스템에 로그인하세요</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
            Google 계정으로 로그인
          </button>

          {loginError && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 rounded-lg bg-red-50 p-4 text-xs text-red-600 border border-red-100"
            >
              <div className="font-bold mb-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                로그인 오류
              </div>
              {loginError}
              <div className="mt-2 p-2 bg-white rounded border border-red-100 break-all select-all">
                현재 도메인: {window.location.hostname}
              </div>
              <p className="mt-2 text-[10px] text-red-400">
                💡 Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains에 위 도메인을 추가해야 합니다.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // Teacher Dashboard Layout
  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-[#1E293B] shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col",
          !sidebarOpen && "-translate-x-full lg:hidden"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                e
              </div>
              <h1 className="text-white font-bold text-lg tracking-tight">e-가정통신문</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-4 flex-grow px-4 space-y-2">
            <SidebarItem 
              icon={<LayoutDashboard />} 
              label="안내장 목록" 
              active={currentView === "notices"} 
              onClick={() => { setCurrentView("notices"); setSelectedNoticeId(null); }} 
            />
            <SidebarItem 
              icon={<Users />} 
              label="학부모 주소록" 
              active={currentView === "address_book"} 
              onClick={() => setCurrentView("address_book")} 
            />
            <SidebarItem 
              icon={<SettingsIcon />} 
              label="환경설정" 
              active={currentView === "settings"} 
              onClick={() => setCurrentView("settings")} 
            />
          </nav>

          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=64748b&color=fff`} 
                alt="Profile" 
                className="w-10 h-10 bg-slate-500 rounded-full flex items-center justify-center text-xs text-white uppercase border border-slate-600"
              />
              <div className="flex flex-col overflow-hidden">
                <span className="text-white text-sm font-semibold truncate">{user.displayName || "선생님"}</span>
                <span className="text-slate-400 text-[11px] truncate">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col bg-[#F8FAFC] overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden text-slate-500"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800">
              {currentView === "notices" && "안내장 대시보드"}
              {currentView === "create_notice" && (selectedNoticeId ? "안내장 수정" : "새 안내장 작성")}
              {currentView === "address_book" && "학부모 주소록 관리"}
              {currentView === "results" && "취합 결과 확인"}
              {currentView === "settings" && "시스템 환경설정"}
            </h2>
            <span className="hidden sm:inline-block bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Connected
            </span>
          </div>
          
          {currentView === "notices" && (
            <button 
              onClick={() => setCurrentView("create_notice")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              신규 등록
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto h-full"
            >
              {currentView === "notices" && (
                <TeacherNoticeList 
                  onCreate={() => setCurrentView("create_notice")}
                  onViewResults={(id) => { setSelectedNoticeId(id); setCurrentView("results"); }}
                  onEdit={(id) => { setSelectedNoticeId(id); setCurrentView("create_notice"); }}
                />
              )}
              {currentView === "create_notice" && (
                <TeacherNoticeForm 
                  noticeId={selectedNoticeId}
                  onCancel={() => { setCurrentView("notices"); setSelectedNoticeId(null); }}
                  onSuccess={() => { setCurrentView("notices"); setSelectedNoticeId(null); }}
                />
              )}
              {currentView === "address_book" && <TeacherAddressBook />}
              {currentView === "results" && (
                <TeacherResults 
                  noticeId={selectedNoticeId!} 
                  onBack={() => { setCurrentView("notices"); setSelectedNoticeId(null); }}
                />
              )}
              {currentView === "settings" && <TeacherSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-3 rounded-md transition-all duration-200 outline-none",
        active 
          ? "text-white bg-blue-600/20 border-l-4 border-blue-500" 
          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
      )}
    >
      <span className={cn("h-5 w-5")}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}
