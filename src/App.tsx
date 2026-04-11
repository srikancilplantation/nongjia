import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Link,
  useLocation
} from 'react-router-dom';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  LayoutDashboard, 
  Sprout, 
  Droplets, 
  BookOpen, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  PlusCircle,
  History,
  CloudSun,
  Calendar as CalendarIcon,
  UserCheck,
  Users,
  StickyNote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import YieldRecords from './components/YieldRecords';
import KnowledgeBase from './components/KnowledgeBase';
import WeatherRecords from './components/WeatherRecords';
import FarmCalendar from './components/FarmCalendar';
import WorkerManagement from './components/WorkerManagement';
import AttendanceRecords from './components/AttendanceRecords';
import CropManagement from './components/CropManagement';
import Management from './components/Management';
import Notebook from './components/Notebook';
import { useCrops } from './hooks/useCrops';

const provider = new GoogleAuthProvider();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { crops, loading: cropsLoading } = useCrops(user);
  const [selectedCrop, setSelectedCrop] = useState<string>('');

  useEffect(() => {
    if (crops.length > 0 && !selectedCrop) {
      setSelectedCrop(crops[0].name);
    }
  }, [crops, selectedCrop]);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Login failed', error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError('域名未授权：请在 Firebase 控制台中将当前域名添加到已授权列表。');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('弹出窗口被拦截：请允许浏览器弹出窗口后再试。');
      } else {
        setLoginError(`登录失败: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50/50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-200/50 max-w-md w-full text-center border border-emerald-100"
        >
          {/* New Sun and Leaf Emblem Logo */}
          <div className="w-32 h-32 mx-auto mb-8 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
              <defs>
                <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Outer Ring */}
              <circle cx="50" cy="50" r="48" fill="white" stroke="#ecfdf5" strokeWidth="1" />
              
              {/* Sun - Rising Style */}
              <g filter="url(#softGlow)">
                <circle cx="50" cy="45" r="22" fill="url(#sunGrad)" />
                {/* Sun Rays */}
                <g className="animate-[spin_30s_linear_infinite]" style={{ transformOrigin: '50px 45px' }}>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <path
                      key={angle}
                      d="M50 12 L50 18"
                      stroke="#fbbf24"
                      strokeWidth="3"
                      strokeLinecap="round"
                      transform={`rotate(${angle} 50 45)`}
                    />
                  ))}
                </g>
              </g>

              {/* Large Cradling Leaf */}
              <path 
                d="M50 92 C20 92 10 65 10 45 C10 35 25 30 50 50 C75 30 90 35 90 45 C90 65 80 92 50 92Z" 
                fill="url(#leafGrad)"
                className="drop-shadow-lg"
              />
              
              {/* Leaf Detail Line */}
              <path 
                d="M50 92 Q50 70 50 50" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                opacity="0.3"
              />
              
              {/* Small Sprout Detail */}
              <circle cx="50" cy="50" r="4" fill="#fbbf24" />
            </svg>
          </div>

          <h1 className="text-4xl font-black text-emerald-950 mb-1 tracking-tight">
            农事<span className="text-emerald-600">管家</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-[1px] w-12 bg-emerald-100"></div>
            <p className="text-emerald-700 font-bold tracking-[0.4em] uppercase text-[9px]">Smart Farm Manager</p>
            <div className="h-[1px] w-12 bg-emerald-100"></div>
          </div>

          {loginError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">
              {loginError}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 group"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
            <span>进入管理系统</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-emerald-50/30 flex">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-emerald-900/10 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-emerald-100 text-slate-600 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="h-full flex flex-col p-6">
            <div className="flex items-center gap-3 mb-10 group cursor-pointer">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center relative border border-emerald-100 shadow-sm overflow-hidden">
                {/* SVG Sidebar Sun and Leaf Emblem Logo */}
                <svg viewBox="0 0 100 100" className="w-10 h-10">
                  <circle cx="50" cy="40" r="20" fill="#fbbf24" />
                  <path 
                    d="M50 90 C20 90 10 65 10 45 C10 35 25 30 50 50 C75 30 90 35 90 45 C90 65 80 90 50 90Z" 
                    fill="#10b981" 
                  />
                  <path d="M50 90 L50 50" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-base tracking-tight leading-tight text-emerald-950">
                  农事<span className="text-emerald-600">管家</span>
                </span>
                <span className="font-bold text-[8px] text-emerald-700/60 tracking-[0.1em] uppercase">Smart Manager</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="ml-auto lg:hidden text-slate-400 hover:text-emerald-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {/* Global Crop Selector in Sidebar */}
              {crops.length > 0 && (
                <div className="mb-6 px-2">
                  <p className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest mb-3 px-2">选择当前作物</p>
                  <div className="space-y-1">
                    {crops.map((crop) => (
                      <button
                        key={crop.id}
                        onClick={() => setSelectedCrop(crop.name)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-bold ${
                          selectedCrop === crop.name 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' 
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${selectedCrop === crop.name ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        {crop.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <NavLink to="/" icon={<LayoutDashboard />} label="管理分析" onClick={() => setIsSidebarOpen(false)} />
              <NavLink to="/calendar" icon={<CalendarIcon />} label="农事日历与记录" onClick={() => setIsSidebarOpen(false)} />
              <NavLink to="/yield" icon={<History />} label="产量记录" onClick={() => setIsSidebarOpen(false)} />
              <NavLink to="/weather" icon={<CloudSun />} label="天气记录" onClick={() => setIsSidebarOpen(false)} />
              <NavLink to="/attendance" icon={<UserCheck />} label="工人出勤" onClick={() => setIsSidebarOpen(false)} />
              <NavLink to="/notebook" icon={<StickyNote />} label="记事本" onClick={() => setIsSidebarOpen(false)} />
              <NavLink to="/management" icon={<Users />} label="基础管理" onClick={() => setIsSidebarOpen(false)} />
            </nav>

            <div className="mt-auto pt-6 border-t border-emerald-50">
              <div className="flex items-center gap-3 mb-4 px-2">
                <img 
                  src={user.photoURL || ''} 
                  alt={user.displayName || ''} 
                  className="w-10 h-10 rounded-full border-2 border-emerald-100"
                  referrerPolicy="no-referrer"
                />
                <div className="overflow-hidden">
                  <p className="font-medium truncate text-slate-700">{user.displayName}</p>
                  <p className="text-xs text-emerald-600/70 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">退出登录</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-emerald-100 flex items-center px-6 lg:px-10 sticky top-0 z-30">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-emerald-600 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-emerald-950 ml-4 lg:ml-0">
              <RouteTitle />
            </h2>
          </header>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10">
            <Routes>
              <Route path="/" element={<Dashboard user={user} selectedCrop={selectedCrop} crops={crops} cropsLoading={cropsLoading} />} />
              <Route path="/calendar" element={<FarmCalendar user={user} selectedCrop={selectedCrop} crops={crops} />} />
              <Route path="/yield" element={<YieldRecords user={user} selectedCrop={selectedCrop} crops={crops} />} />
              <Route path="/weather" element={<WeatherRecords user={user} />} />
              <Route path="/attendance" element={<AttendanceRecords user={user} selectedCrop={selectedCrop} crops={crops} />} />
              <Route path="/notebook" element={<Notebook user={user} />} />
              <Route path="/management" element={<Management user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

function NavLink({ to, icon, label, onClick }: { to: string, icon: React.ReactNode, label: string, onClick: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
        ${isActive 
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
          : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'}
      `}
    >
      <span className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      <span className="font-semibold text-sm tracking-wide">{label}</span>
      {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
    </Link>
  );
}

function RouteTitle() {
  const location = useLocation();
  switch (location.pathname) {
    case '/': return '管理分析仪表盘';
    case '/calendar': return '农事日历与记录';
    case '/yield': return '产量记录';
    case '/weather': return '天气记录';
    case '/attendance': return '工人出勤记录';
    case '/notebook': return '记事本';
    case '/management': return '基础管理';
    default: return '农事管家';
  }
}
