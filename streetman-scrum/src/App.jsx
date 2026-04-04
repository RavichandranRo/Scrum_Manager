import React, { useState, useEffect, useMemo, useRef } from 'react';
// SQLite migration note:
// Firebase imports intentionally commented per request (do not remove).
import {
  LayoutDashboard, PlusCircle, Users, FileSpreadsheet, Copy, Mail, MessageSquare,
  LogOut, ChevronDown, CheckCircle2, AlertTriangle, Lock, ShieldCheck, UserCog,
  Clock, CalendarCheck, WifiOff, CloudLightning, Database, RefreshCw, Send,
  User, ExternalLink, Download, Bell, Coffee, History
} from 'lucide-react';

let configError = null;

const appId = "streetman-scrum-automation";

// --- NEW SERVER CONFIGURATION ---
const BACKEND_URL = 'http://192.168.26.210:3001';

// --- TEAM CONFIGURATION ---
const PROJECTS = ['SMNGUI', 'Hardware', 'Core', 'SNC', 'AWS'];
const MEMBER_TEAMS = ['StreetMan QA', 'StreetMan Dev', 'Hardware', 'StreetMan NexGen Dev'];
const CUSTOM_PROJECTS_STORAGE_KEY = 'streetman_custom_projects';
const CUSTOM_USERS_STORAGE_KEY = 'streetman_custom_users';

// PROJECT MAPPING FOR EXPORT
const PROJECT_CATEGORIES = {
  'Hardware': 'Hardware',
  'SMNGUI': 'SMNGUI',
  'Core': 'Core',
  'SNC': 'SNC',
  'AWS': 'AWS'
};

// HARDCODED TEAM MEMBERS
const DEFAULT_USERS = [
  { id: '1349', name: 'Ravichandran C', team: 'StreetMan QA', role: 'ADMIN', pin: '1349' },
  { id: '1253', name: 'Keerthana M', team: 'StreetMan QA', role: 'MEMBER', pin: '1253' },
  { id: '1266', name: 'Manirathinam S', team: 'StreetMan QA', role: 'MEMBER', pin: '1266' },
  { id: '1252', name: 'Karthika S', team: 'StreetMan QA', role: 'MEMBER', pin: '1252' },
  { id: '1342', name: 'Vignesh S', team: 'StreetMan QA', role: 'MEMBER', pin: '1342' },
  { id: '1220', name: 'Shanmugam S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1220' },
  { id: '1312', name: 'Keerthana S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1312' },
  { id: '1316', name: 'Gobi S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1316' },
  { id: '1335', name: 'Surendar S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1335' },
  { id: '1345', name: 'Nithishkumar M', team: 'StreetMan Dev', role: 'MEMBER', pin: '1345' },
  { id: '1341', name: 'Thinakaran S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1341' },
  { id: '1363', name: 'Balamurugan B', team: 'Hardware', role: 'MEMBER', pin: '1363' },
  { id: '1299', name: 'Kanishka V R', team: 'StreetMan NexGen Dev', role: 'MEMBER', pin: '1299' },
  { id: '1247', name: 'Krithinarayanan G', team: 'StreetMan NexGen Dev', role: 'MEMBER', pin: '1247' },
  { id: '1284', name: 'Sooryaprakash S', team: 'StreetMan NexGen Dev', role: 'MEMBER', pin: '1284' },
  { id: '1181', name: 'Subburam A', team: 'StreetMan NexGen Dev', role: 'MEMBER', pin: '1181' },
  { id: '1329', name: 'Umapathi C', team: 'StreetMan NexGen Dev', role: 'MEMBER', pin: '1329' },
];

// --- HELPER FUNCTIONS ---
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (e) {}
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).replace(/ /g, '-');
};

const getTodayString = () => new Date().toISOString().split('T')[0];
const getPreviousDateString = (dateStr) => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

const checkTimeWindows = (targetDateStr) => {
  const now = new Date();
  const hours = now.getHours();
  
  return {
    isDayStartOpen: hours < 23, // Day start open until 11:00 PM
    isDayEndOpen: hours >= 17 && hours < 23 // Day end open from 5:00 PM to 11:00 PM
  };
};

const parseDurationToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const value = String(timeStr).trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(value)) return Math.round(parseFloat(value) * 60);

  const hoursMatch = value.match(/(\d+(\.\d+)?)\s*h/);
  const minsMatch = value.match(/(\d+(\.\d+)?)\s*m/);
  let totalMinutes = 0;
  if (hoursMatch) totalMinutes += parseFloat(hoursMatch[1]) * 60;
  if (minsMatch) totalMinutes += parseFloat(minsMatch[1]);
  return Math.round(totalMinutes);
};
const durationToHours = (timeStr) => parseDurationToMinutes(timeStr) / 60;
const formatMinutesToDuration = (minutes) => {
  if (minutes === 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// --- GLOBAL STYLES ---
const inputBase = "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 transition-colors";

// --- CUSTOM COMPONENTS ---
const AutoResizeTextarea = ({ value, onChange, placeholder, disabled, className }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={1}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`resize-none overflow-hidden ${className}`}
    />
  );
};

// Unified Time Input with clamping and perfectly fitted width
const TimeInput = ({ hours, minutes, onHoursChange, onMinutesChange, disabled }) => {
  const handleHours = (e) => {
    if (e.target.value !== '') {
      let val = parseInt(e.target.value, 10);
      if (val > 24) e.target.value = '24';
      if (val < 0) e.target.value = '0';
    }
    onHoursChange(e);
  };

  const handleMinutes = (e) => {
    if (e.target.value !== '') {
      let val = parseInt(e.target.value, 10);
      if (val > 60) e.target.value = '60';
      if (val < 0) e.target.value = '0';
    }
    onMinutesChange(e);
  };

  return (
    <div className="flex items-stretch w-max shrink-0 shadow-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden transition-colors">
      <input
        type="number" min="0" max="24" step="1"
        value={hours} onChange={handleHours} disabled={disabled}
        className="w-10 text-center bg-transparent text-slate-900 dark:text-slate-100 p-2 text-sm outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        placeholder="0" title="Hour(s)"
      />
      <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 border-l border-r border-slate-300 dark:border-slate-600 whitespace-nowrap">
        Hour(s)
      </div>

      <input
        type="number" min="0" max="60" step="1"
        value={minutes} onChange={handleMinutes} disabled={disabled}
        className="w-10 text-center bg-transparent text-slate-900 dark:text-slate-100 p-2 text-sm outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        placeholder="0" title="Minute(s)"
      />
      <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 border-l border-slate-300 dark:border-slate-600 whitespace-nowrap">
        Min(s)
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login');
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [users, setUsers] = useState(() => {
    try {
      const storedUsers = JSON.parse(localStorage.getItem(CUSTOM_USERS_STORAGE_KEY) || '[]');
      return [...DEFAULT_USERS, ...storedUsers];
    } catch {
      return DEFAULT_USERS;
    }
  });
  const [customProjects, setCustomProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_PROJECTS_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const [statusData, setStatusData] = useState([]);
  const [appConfig, setAppConfig] = useState({ currentScrumMasterId: '1349' });

  const [authError, setAuthError] = useState(null);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const customUsers = users.filter((u) => !DEFAULT_USERS.some((d) => d.id === u.id));
    localStorage.setItem(CUSTOM_USERS_STORAGE_KEY, JSON.stringify(customUsers));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_PROJECTS_STORAGE_KEY, JSON.stringify(customProjects));
  }, [customProjects]);

  const isAdmin = currentUserProfile?.role === 'ADMIN';
  const isScrumMaster = currentUserProfile?.id === appConfig.currentScrumMasterId || isAdmin;

  // --- AUTH LOADING ---
  useEffect(() => {
    if (configError) return;
    setUser({ id: 'sqlite-local-user' });
  }, []);

  // --- DATA LOADING FROM SERVER ---
  useEffect(() => {
    if (!user) return;

    const fetchStatuses = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/daily-status`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const data = await res.json();
        setStatusData(data);
        setDbError(null);
      } catch (err) {
        console.error("Fetch error:", err);
        setDbError("Could not connect to database server at " + BACKEND_URL);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // --- HANDLERS ---
  const handleLogin = (profile) => {
    const pin = window.prompt(`Enter PIN for ${profile.name}:`);
    if (!pin || pin !== profile.pin) {
      alert("Incorrect credentials. Access Denied.");
      return;
    }
    setCurrentUserProfile(profile);
    setActiveTab('input');
  };

  const handleLogout = () => {
    setCurrentUserProfile(null);
    setActiveTab('login');
  };

  // --- RENDER ---
  if (configError) return <ErrorScreen title="Config Error" message={configError} />;
  if (authError) return <ErrorScreen title="Auth Failed" message={authError} />;

  if (!user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="text-slate-500 font-medium">Connecting to StreetMan Secure Server...</p>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!currentUserProfile || activeTab === 'login') {
    return (
      <div className="w-screen h-screen bg-slate-100 flex items-center justify-center p-4 overflow-hidden">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">ScrumMan</h1>
            <p className="text-slate-500">Select your profile to continue</p>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => handleLogin(u)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs group-hover:text-white transition-colors ${u.role === 'ADMIN' ? 'bg-red-100 text-red-600 group-hover:bg-red-500' : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-600'}`}>
                    {u.role === 'ADMIN' ? <Lock size={12} /> : u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 group-hover:text-indigo-700">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.team}</p>
                  </div>
                </div>
                {u.role === 'ADMIN' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">LOCKED</span>}
                {u.id === appConfig.currentScrumMasterId && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">SM</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-x-hidden">
      <nav className="bg-indigo-900 text-white shadow-lg sticky top-0 z-50 w-full flex justify-center">
        <div className="w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-indigo-900" />
              </div>
              <span className="font-bold text-lg tracking-wide hidden sm:block">ScrumMan</span>
            </div>

            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <NavButton active={activeTab === 'input'} onClick={() => setActiveTab('input')} icon={<PlusCircle size={18} />}>
                  Daily Input
                </NavButton>
                {(isScrumMaster || isAdmin) && (
                  <>
                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Users size={18} />}>
                      Scrum Board
                    </NavButton>
                    <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileSpreadsheet size={18} />}>
                      Reports
                    </NavButton>
                    <NavButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={<History size={18} />}>
                      Audit Logs
                    </NavButton>
                  </>
                )}
                {isAdmin && (
                  <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<UserCog size={18} />}>
                    Admin
                  </NavButton>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm bg-indigo-800 py-1.5 px-3 rounded-full hover:bg-indigo-700 transition border border-indigo-700">
                  <User size={14} />
                  <span className="font-medium">{currentUserProfile.name}</span>
                  <ChevronDown size={14} />
                </button>

                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-xl py-1 hidden group-hover:block border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 z-50">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-bold">{currentUserProfile.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{currentUserProfile.team}</p>
                  </div>

                  {(isAdmin || isScrumMaster) && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50">Switch Account</div>
                      <div className="max-h-48 overflow-y-auto">
                        {users.filter(u => u.id !== currentUserProfile.id).map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleLogin(u)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 flex justify-between"
                          >
                            <span>{u.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                    </>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {dbError && (
        <div className="w-full bg-red-500 text-white text-center py-2 text-sm flex items-center justify-center gap-2 font-bold shadow-md relative z-40">
          <WifiOff size={16} /> {dbError}
        </div>
      )}

      <main className="w-full flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl">
          {activeTab === 'input' && (
            <InputView
              currentUserProfile={currentUserProfile}
              existingData={statusData}
              customProjects={customProjects}
              setCustomProjects={setCustomProjects}
              setStatusData={setStatusData}
            />
          )}
          {activeTab === 'dashboard' && (isScrumMaster || isAdmin) && <DashboardView data={statusData} currentSM={currentUserProfile} users={users} canManage={isScrumMaster || isAdmin} setStatusData={setStatusData} />}
          {activeTab === 'reports' && (isScrumMaster || isAdmin) && <ReportsView data={statusData} />}
          {activeTab === 'logs' && (isScrumMaster || isAdmin) && <AuditLogsView data={statusData} />}
          {activeTab === 'admin' && isAdmin && (
            <AdminView
              users={users}
              setUsers={setUsers}
              config={appConfig}
              setConfig={setAppConfig}
            />
          )}

          {!isScrumMaster && !isAdmin && activeTab !== 'input' && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Lock size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
              <p>Restricted Access. Only Scrum Master/Admin can view this.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const ErrorScreen = ({ title, message }) => (
  <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 flex-col gap-4 p-4">
    <AlertTriangle size={48} className="text-red-500" />
    <div className="text-center max-w-lg bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
      <p className="font-bold text-slate-800 text-xl mb-2">{title}</p>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  </div>
);

const NavButton = ({ active, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active
      ? 'bg-indigo-700 text-white shadow-sm'
      : 'text-indigo-100 hover:bg-indigo-800'
      }`}
  >
    {icon}
    {children}
  </button>
);

// --- VIEW 1: Input Status ---
function InputView({ currentUserProfile, existingData, customProjects, setCustomProjects, setStatusData }) {
  const [inputDate, setInputDate] = useState(getTodayString());
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const { isDayStartOpen, isDayEndOpen } = checkTimeWindows(inputDate);

  const existingEntry = existingData.find(d => d.date === inputDate && d.userId === currentUserProfile.id);
  const previousDate = getPreviousDateString(inputDate);
  const previousEntry = existingData.find(d => d.date === previousDate && d.userId === currentUserProfile.id);
  const isUpdateMode = !!existingEntry;
  const isOnLeave = existingEntry?.status === 'LEAVE';

  const [formData, setFormData] = useState({
    yesterdayWork: [],
    todayPlan: [],
    todayActuals: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const allProjects = useMemo(() => [...PROJECTS, ...customProjects], [customProjects]);

  useEffect(() => {
    setIsDirty(false);
    setLoading(true);
  }, [inputDate]);

  useEffect(() => {
    if (isDirty) return;

    const parseTime = (timeStr) => {
      if (!timeStr) return { hours: '0', minutes: '0' };
      const str = String(timeStr).trim().toLowerCase();
      let h = '0'; let m = '0';
      const hMatch = str.match(/(\d+(\.\d+)?)\s*h/);
      const mMatch = str.match(/(\d+(\.\d+)?)\s*m/);
      if (hMatch) h = hMatch[1];
      if (mMatch) m = mMatch[1];
      if (!hMatch && !mMatch && /^\d+(\.\d+)?$/.test(str)) h = str;
      return { hours: h, minutes: m };
    };

    const formatLoadedTask = (t, isActuals = false) => {
      const parsedTime = parseTime(isActuals ? (t.actualTime || t.time) : t.time);
      return {
        ...t,
        hours: parsedTime.hours,
        minutes: parsedTime.minutes,
        isBlocked: !!(t.blockerReason && t.blockerReason.trim().length > 0)
      };
    };

    if (existingEntry) {
      setFormData({
        yesterdayWork: (existingEntry.yesterdayWork || []).map(t => formatLoadedTask(t, false)),
        todayPlan: (existingEntry.todayPlan || []).map(t => formatLoadedTask(t, false)),
        todayActuals: existingEntry.todayActuals?.length > 0
          ? existingEntry.todayActuals.map(t => formatLoadedTask(t, true))
          : (existingEntry.todayPlan || []).map(p => ({
            ...formatLoadedTask(p, false),
            status: 'Completed',
            isBlocked: false,
            blockerReason: ''
          }))
      });
    } else {
      const autoYesterday = (previousEntry?.todayActuals || [])
        .filter((task) => (task.task || '').trim())
        .map((t) => ({
          ...formatLoadedTask(t, true),
          status: 'Completed',
          isBlocked: false,
          blockerReason: ''
        }));

      setFormData({
        yesterdayWork: autoYesterday.length > 0 ? autoYesterday : [{ task: '', project: 'SMNGUI', hours: '0', minutes: '0', status: 'Completed', priority: 'Medium', isBlocked: false, blockerReason: '' }],
        todayPlan: [{ task: '', project: 'SMNGUI', hours: '0', minutes: '0', priority: 'Medium' }],
        todayActuals: []
      });
    }
    setLoading(false);
  }, [existingEntry, previousEntry, currentUserProfile.id, inputDate, isDirty]);

  const handleTaskChange = (section, index, field, value) => {
    setIsDirty(true);
    const newSection = [...formData[section]];
    newSection[index][field] = value;
    setFormData({ ...formData, [section]: newSection });
  };

  const addCustomProject = (value) => {
    const normalized = value.trim();
    if (!normalized) return;
    if ([...PROJECTS, ...customProjects].some((p) => p.toLowerCase() === normalized.toLowerCase())) return;
    setCustomProjects((prev) => [...prev, normalized]);
  };

  const addTask = (section) => {
    setIsDirty(true);
    const item = { task: '', project: 'SMNGUI', hours: '0', minutes: '0', priority: 'Medium', isBlocked: false, blockerReason: '' };
    if (section !== 'todayPlan') item.status = 'Completed';
    setFormData({ ...formData, [section]: [...formData[section], item] });
  };

  const removeTask = (section, index) => {
    if (formData[section].length <= 1) {
      alert("You must have at least one task in this section.");
      return;
    }
    setIsDirty(true);
    const newSection = formData[section].filter((_, i) => i !== index);
    setFormData({ ...formData, [section]: newSection });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDayStartOpen && !isDayEndOpen) {
      alert("Status window is closed. You can submit only during allowed day-start/day-end timings.");
      return;
    }
    const blockedWithoutReason = formData.todayActuals.some(
      (task) => task.isBlocked && !(task.blockerReason || '').trim()
    );
    if (blockedWithoutReason) {
      alert("Please provide a blocker reason for all checked blocked tasks before saving.");
      return;
    }
    if (!window.confirm(`Are you sure you want to submit your status for ${formatDate(inputDate)}?`)) return;

    setSubmitting(true);
    setMessage(null);
    const now = new Date().toISOString();

    const formatSavedTask = (t, isActuals = false) => {
      const payload = {
        task: t.task, project: t.project, priority: t.priority,
        status: t.status || 'Completed',
        blockerReason: t.isBlocked ? t.blockerReason : ''
      };
      const h = parseFloat(t.hours || 0);
      const m = parseInt(t.minutes || 0, 10);
      const timeStrParts = [];
      if (h > 0) timeStrParts.push(`${h}h`);
      if (m > 0) timeStrParts.push(`${m}m`);
      const finalTimeStr = timeStrParts.length > 0 ? timeStrParts.join(' ') : '0h';

      if (isActuals) payload.actualTime = finalTimeStr;
      else payload.time = finalTimeStr;

      return payload;
    };

    try {
      const payload = {
        id: isUpdateMode ? existingEntry.id : generateId(),
        userId: currentUserProfile.id,
        userName: currentUserProfile.name,
        team: currentUserProfile.team,
        date: inputDate,
        yesterdayWork: formData.yesterdayWork.map(t => formatSavedTask(t, false)),
        todayPlan: formData.todayPlan.map(t => formatSavedTask(t, false)),
        todayActuals: isUpdateMode ? formData.todayActuals.map(t => formatSavedTask(t, true)) : [],
        approved: false,
        updatedAt: now
      };

      if (!isUpdateMode) payload.createdAt = now;

      const res = await fetch(`${BACKEND_URL}/api/daily-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Server rejected the save");

      if (isUpdateMode) {
        setStatusData(prev => prev.map(record => record.id === payload.id ? { ...record, ...payload } : record));
      } else {
        setStatusData(prev => [payload, ...prev]);
      }

      setIsDirty(false);
      setMessage({ type: 'success', text: 'Status Saved Successfully!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save status: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (isOnLeave) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-amber-100 dark:border-amber-900/50">
        <Coffee size={64} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">You are marked as On Leave</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Enjoy your time off! No status updates required for this day.</p>
      </div>
    );
  }

  // Expanded Container Width
  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {isUpdateMode ? <Clock className="text-amber-600" /> : <CalendarCheck className="text-indigo-600" />}
              {isUpdateMode ? 'Update Status' : 'New Status Entry'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date:</span>
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                max={getTodayString()}
                className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>
          <span className="text-sm font-medium bg-slate-200 dark:bg-slate-600 px-3 py-1 rounded-full text-slate-700 dark:text-slate-100">{currentUserProfile.name}</span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
              {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {message.text}
            </div>
          )}
          <datalist id="project-options">
            {allProjects.map((projectName) => <option key={projectName} value={projectName} />)}
          </datalist>

          <div className={`space-y-4 rounded-xl p-4 border ${!isDayStartOpen ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80' : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50'}`}>
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-600 pb-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                1. Day Start Plan
                {!isDayStartOpen && <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded flex items-center gap-1"><Lock size={10} /> Locked</span>}
              </h3>
              {isDayStartOpen && <button type="button" onClick={() => addTask('yesterdayWork')} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">+ Task</button>}
            </div>

            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-2">Yesterday's Work</p>
            {formData.yesterdayWork.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 relative pr-12">
                <AutoResizeTextarea disabled={!isDayStartOpen} placeholder="What did you finish?" value={item.task} onChange={(e) => handleTaskChange('yesterdayWork', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} required />
                <input
                  disabled={!isDayStartOpen} type="text" list="project-options" value={item.project} onChange={(e) => handleTaskChange('yesterdayWork', idx, 'project', e.target.value)} onBlur={(e) => addCustomProject(e.target.value)}
                  placeholder="Project" className={`w-32 ${inputBase}`} required
                />
                <TimeInput hours={item.hours} minutes={item.minutes} onHoursChange={(e) => handleTaskChange('yesterdayWork', idx, 'hours', e.target.value)} onMinutesChange={(e) => handleTaskChange('yesterdayWork', idx, 'minutes', e.target.value)} disabled={!isDayStartOpen} />
                <select disabled={!isDayStartOpen} value={item.priority || 'Medium'} onChange={(e) => handleTaskChange('yesterdayWork', idx, 'priority', e.target.value)} className={`w-24 ${inputBase}`}>
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                </select>

                {/* Blocked Checkbox Removed from Yesterday's Work */}

                {isDayStartOpen && <button type="button" onClick={() => removeTask('yesterdayWork', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><LogOut size={18} /></button>}
              </div>
            ))}

            <div className="flex justify-between items-center mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Today's Plan</p>
              {isDayStartOpen && <button type="button" onClick={() => addTask('todayPlan')} className="text-xs text-blue-600 dark:text-blue-400 font-bold">+ Plan Item</button>}
            </div>
            {formData.todayPlan.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 relative pr-12">
                <AutoResizeTextarea disabled={!isDayStartOpen} placeholder="Planned task..." value={item.task} onChange={(e) => handleTaskChange('todayPlan', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} required />
                <input
                  disabled={!isDayStartOpen} type="text" list="project-options" value={item.project || 'SMNGUI'} onChange={(e) => handleTaskChange('todayPlan', idx, 'project', e.target.value)} onBlur={(e) => addCustomProject(e.target.value)}
                  placeholder="Project" className={`w-32 ${inputBase}`} required
                />
                <TimeInput hours={item.hours} minutes={item.minutes} onHoursChange={(e) => handleTaskChange('todayPlan', idx, 'hours', e.target.value)} onMinutesChange={(e) => handleTaskChange('todayPlan', idx, 'minutes', e.target.value)} disabled={!isDayStartOpen} />
                <select disabled={!isDayStartOpen} value={item.priority || 'Medium'} onChange={(e) => handleTaskChange('todayPlan', idx, 'priority', e.target.value)} className={`w-24 ${inputBase}`}>
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                </select>

                {isDayStartOpen && <button type="button" onClick={() => removeTask('todayPlan', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><LogOut size={18} /></button>}
              </div>
            ))}
          </div>

          {isUpdateMode && (
            <div className={`space-y-4 rounded-xl p-4 border ${!isDayEndOpen ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-80' : 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/50'}`}>
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-600 pb-2">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-400 flex items-center gap-2">
                  2. Day End Actuals
                  {!isDayEndOpen && <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded flex items-center gap-1"><Lock size={10} /> Closed (Opens at 5 PM)</span>}
                </h3>
                {isDayEndOpen && <button type="button" onClick={() => addTask('todayActuals')} className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 font-medium">+ Actual Item</button>}
              </div>

              {formData.todayActuals.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-green-200 dark:border-green-800/50 relative pr-12">
                  <AutoResizeTextarea disabled={!isDayEndOpen} placeholder="Actual task done" value={item.task} onChange={(e) => handleTaskChange('todayActuals', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} />
                  <input
                    disabled={!isDayEndOpen} type="text" list="project-options" value={item.project || 'SMNGUI'} onChange={(e) => handleTaskChange('todayActuals', idx, 'project', e.target.value)} onBlur={(e) => addCustomProject(e.target.value)}
                    placeholder="Project" className={`w-32 ${inputBase}`}
                  />
                  <select disabled={!isDayEndOpen} value={item.priority || 'Medium'} onChange={(e) => handleTaskChange('todayActuals', idx, 'priority', e.target.value)} className={`w-24 ${inputBase}`}>
                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                  </select>
                  <select disabled={!isDayEndOpen} value={item.status} onChange={(e) => handleTaskChange('todayActuals', idx, 'status', e.target.value)} className={`w-32 ${inputBase}`}>
                    <option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Blocked">Blocked</option>
                  </select>
                  <TimeInput hours={item.hours} minutes={item.minutes} onHoursChange={(e) => handleTaskChange('todayActuals', idx, 'hours', e.target.value)} onMinutesChange={(e) => handleTaskChange('todayActuals', idx, 'minutes', e.target.value)} disabled={!isDayEndOpen} />

                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer shrink-0 whitespace-nowrap">
                    <input type="checkbox" checked={item.isBlocked} onChange={(e) => handleTaskChange('todayActuals', idx, 'isBlocked', e.target.checked)} disabled={!isDayEndOpen} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800 w-4 h-4" />
                    Blocked
                  </label>

                  {isDayEndOpen && <button type="button" onClick={() => removeTask('todayActuals', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><LogOut size={18} /></button>}

                  {item.isBlocked && (
                    <input disabled={!isDayEndOpen} type="text" placeholder="Explain the blocker..." value={item.blockerReason} onChange={(e) => handleTaskChange('todayActuals', idx, 'blockerReason', e.target.value)} className={`w-full mt-1 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ${inputBase}`} required />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              type="submit"
              disabled={submitting || (!isDayStartOpen && !isDayEndOpen)}
              className={`px-8 py-3 rounded-lg text-white font-semibold shadow-md hover:shadow-lg transition-all ${submitting || (!isDayStartOpen && !isDayEndOpen) ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {submitting ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- VIEW 2: Scrum Dashboard ---
function DashboardView({ data, currentSM, users, canManage, setStatusData }) {
  const isManagerView = canManage || currentSM?.role === 'ADMIN';
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [generatedContent, setGeneratedContent] = useState(null);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('https://default414ad49ffdc94181bd7eba81a9cdb7.7f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3af37b0ffc76482586cb2c84319d8242/triggers/manual/paths/invoke?api-version=1');
  const [emailConfig, setEmailConfig] = useState({
    address: 'admin@company.com',
    to: 'smscrum@dhyan.com'
  });

  const [teamsReminderConfig, setTeamsReminderConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('streetman_teams_reminder_config') || '{"recipients":""}');
    } catch {
      return { recipients: '' };
    }
  });

  const dailyData = useMemo(() => data.filter(d => d.date === selectedDate), [data, selectedDate]);

  const missingUsers = useMemo(() => {
    const submittedIds = dailyData.map(d => d.userId);
    return users.filter(u => {
      const submission = dailyData.find(d => d.userId === u.id);
      const isLeave = submission?.status === 'LEAVE';
      return !submittedIds.includes(u.id) && !isLeave && u.role !== 'ADMIN';
    });
  }, [dailyData]);

  const toggleApproval = async (docId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'Unapprove' : 'Approve'} this status?`)) return;

    const recordToUpdate = data.find(r => r.id === docId);
    if (!recordToUpdate) return;
    const updatedRecord = { ...recordToUpdate, approved: !currentStatus, updatedAt: new Date().toISOString() };

    try {
      const res = await fetch(`${BACKEND_URL}/api/daily-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecord)
      });
      if (!res.ok) throw new Error("Server error");

      setStatusData(prev => prev.map(record => record.id === docId ? updatedRecord : record));
    } catch (err) {
      alert("Failed to update approval status.");
    }
  };

  const markAsLeave = async (user) => {
    if (!window.confirm(`Mark ${user.name} as ON LEAVE for ${formatDate(selectedDate)}?`)) return;

    const payload = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      team: user.team,
      date: selectedDate,
      status: 'LEAVE',
      yesterdayWork: [],
      todayPlan: [],
      todayActuals: [],
      approved: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/daily-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Server error");

      setStatusData(prev => [payload, ...prev]);
    } catch (err) {
      alert("Failed to mark as leave.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => alert('Copied!')).catch(err => alert('Failed to copy'));
  };

  const copyHtmlToClipboard = (elementId) => {
    const node = document.getElementById(elementId);
    const range = document.createRange();
    range.selectNode(node);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    alert('HTML copied!');
  };

  const generateReminderText = () => {
    if (missingUsers.length === 0) return "All members have submitted. Good job!";
    const recipients = teamsReminderConfig.recipients
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const recipientText = recipients.length > 0 ? `Recipients: ${recipients.join(', ')}` : '';
    return `Hello team, awaiting updates from: ${missingUsers.map(u => u.name).join(', ')}. Please submit ASAP.${recipientText ? `\n${recipientText}` : ''}`;
  };

  useEffect(() => {
    localStorage.setItem('streetman_teams_reminder_config', JSON.stringify(teamsReminderConfig));
  }, [teamsReminderConfig]);

  const weeklyTrend = useMemo(() => {
    const end = new Date(selectedDate);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const teamUsers = users.filter((u) => u.role !== 'ADMIN');
    const teamMemberIds = new Set(teamUsers.map((u) => u.id));
    const weekData = data.filter((d) => {
      if (!teamMemberIds.has(d.userId)) return false;
      const date = new Date(d.date);
      return date >= start && date <= end;
    });

    const totalDays = 7;
    const expected = teamUsers.length * totalDays;
    const submitted = weekData.length;
    const submittedPct = expected > 0 ? (submitted / expected) * 100 : 0;

    let plannedHours = 0;
    let actualHours = 0;
    let plannedCount = 0;
    let actualCount = 0;
    const blockerMap = {};
    weekData.forEach((entry) => {
      (entry.todayPlan || []).forEach((task) => {
        if ((task.task || '').trim()) {
          plannedHours += durationToHours(task.time);
          plannedCount += 1;
        }
      });
      (entry.todayActuals || []).forEach((task) => {
        if ((task.task || '').trim()) {
          actualHours += durationToHours(task.actualTime || task.time);
          actualCount += 1;
        }
        if ((task.status || '').toLowerCase() === 'blocked' && (task.blockerReason || '').trim()) {
          const blocker = task.blockerReason.trim();
          blockerMap[blocker] = (blockerMap[blocker] || 0) + 1;
        }
      });
    });

    const topBlockers = Object.entries(blockerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      submittedPct,
      avgPlannedHours: plannedCount ? plannedHours / plannedCount : 0,
      avgActualHours: actualCount ? actualHours / actualCount : 0,
      topBlockers
    };
  }, [data, selectedDate, users]);

  useEffect(() => {
    if (!currentSM) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayKey = `${getTodayString()}-${hhmm}`;
    const triggered = localStorage.getItem(`streetman_reminder_${todayKey}`);

    if ((hhmm === '11:30' || hhmm === '18:30') && !triggered && missingUsers.length > 0) {
      alert(`Reminder schedule (${hhmm}) triggered for ${missingUsers.length} pending update(s).`);
      localStorage.setItem(`streetman_reminder_${todayKey}`, '1');
      navigator.clipboard.writeText(generateReminderText()).catch(() => { });
      const recipients = teamsReminderConfig.recipients
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (recipients.length > 0) {
        const subject = encodeURIComponent(`Scrum Reminder - ${formatDate(selectedDate)}`);
        const body = encodeURIComponent(`⏰ Scrum Reminder (${hhmm})\n\n${generateReminderText()}`);
        const mailtoUrl = `mailto:${encodeURIComponent(recipients.join(','))}?subject=${subject}&body=${body}`;
        window.open(mailtoUrl, '_blank');
        alert(`Reminder email draft opened for ${recipients.length} recipient(s).`);
      } else {
        alert(`Reminder schedule (${hhmm}) triggered for ${missingUsers.length} pending update(s). Configure recipient mail IDs to draft emails.`);
      }
    }
  }, [currentSM, missingUsers, teamsReminderConfig, selectedDate]);

  const sendTeamsWebhook = async (type) => {
    if (!teamsWebhookUrl.trim()) {
      alert('Add Teams incoming webhook URL first.');
      return;
    }

    const text = generateTeamsText(type);
    try {
      const response = await fetch(teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      alert('Posted to Microsoft Teams successfully.');
    } catch (error) {
      alert(`Failed to post to Teams webhook: ${error.message}`);
    }
  };

  const downloadPythonScript = () => {
    let htmlTable = `<table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <thead style="background-color: #1e3a8a; color: white;">
            <tr>
                <th style="padding: 8px;">Member</th>
                <th style="padding: 8px;">Yesterday's Work</th>
                <th style="padding: 8px;">Today's Plan</th>
            </tr>
        </thead>
        <tbody>`;

    dailyData.forEach((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f3f4f6';
      if (row.status === 'LEAVE') {
        htmlTable += `<tr style="background-color: ${bg};">
                <td style="padding: 8px; vertical-align: top; border: 1px solid #ddd;"><strong>${row.userName}</strong></td>
                <td colspan="2" style="padding: 8px; vertical-align: middle; text-align: center; background-color: #FFFFE0; color: #000; font-weight: bold; border: 1px solid #ddd;">ON LEAVE</td>
              </tr>`;
      } else {
        const yesterday = row.yesterdayWork.map(t => `<li>${t.task}</li>`).join('');
        const today = row.todayPlan.map(t => `<li>${t.task}</li>`).join('');

        htmlTable += `<tr style="background-color: ${bg};">
                <td style="padding: 8px; vertical-align: top; border: 1px solid #ddd;"><strong>${row.userName}</strong></td>
                <td style="padding: 8px; vertical-align: top; border: 1px solid #ddd;"><ul>${yesterday}</ul></td>
                <td style="padding: 8px; vertical-align: top; border: 1px solid #ddd;"><ul>${today}</ul></td>
              </tr>`;
      }
    });
    htmlTable += `</tbody></table>`;

    const scriptContent = `import sys
import subprocess

def ensure_pywin32():
    try:
        import win32com.client  # noqa
    except ImportError:
        print("📦 pywin32 not found. Installing...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "pywin32"
        ])
        print("✅ pywin32 installed successfully")

ensure_pywin32()
import win32com.client as win32

# --- CONFIG ---
TO_EMAILS = "${emailConfig.to}"
SUBJECT = "StreetMan Scrum Status - ${formatDate(selectedDate)}"

# --- CONTENT ---
html_content = """
<p style="font-family: Arial, sans-serif;">Hi Team,</p>
<p style="font-family: Arial, sans-serif;">Please find the scrum status for today.</p>
${htmlTable}
<p style="font-family: Arial, sans-serif;">Thanks,<br/>${currentSM.name}</p>
"""

# --- SEND VIA OUTLOOK DESKTOP ---
try:
    print("🔄 Connecting to Outlook...")
    outlook = win32.Dispatch('outlook.application')
    mail = outlook.CreateItem(0) # 0 = olMailItem
    
    mail.To = TO_EMAILS
    mail.Subject = SUBJECT
    mail.HTMLBody = html_content
    
    # mail.Display() # Uncomment if you want to preview before sending
    mail.Send()
    
    print(f"✅ Email sent successfully to {TO_EMAILS} via Outlook Desktop!")

except Exception as e:
    print(f"❌ Error sending email: {e}")
    print("👉 Note: Ensure Microsoft Outlook is installed and running.")
    print("👉 Try running: pip install pywin32")
`;

    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `send_status_${selectedDate}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const generateTeamsText = (type) => {
    const header = type === 'start'
      ? `Daily work plan ${formatDate(selectedDate)}:`
      : `Daily work summary ${formatDate(selectedDate)}:`;

    let content = `**${header}**\n\n`;

    dailyData.forEach(userEntry => {
      if (userEntry.status === 'LEAVE') return;

      let tasks = type === 'start' ? (userEntry.todayPlan || []) : (userEntry.todayActuals?.length > 0 ? userEntry.todayActuals : []);
      if (tasks.length === 0) content += "  - No tasks recorded\n";
      else tasks.forEach((t, i) => content += `${i + 1}. ${t.task} - ${t.project || 'General'} - ${t.time || t.actualTime || ''} - ${t.priority || 'Medium'}${t.blockerReason ? ` - Blocker: ${t.blockerReason}` : ''}${type === 'end' ? ` - ${t.status || 'Done'}` : ''}\n`);
      content += '\n';
    });
    return content;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" /> Scrum Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Action Center for Scrum Master <strong>{currentSM.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">View Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={inputBase}
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isManagerView ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
        {isManagerView && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition cursor-pointer group" onClick={() => setGeneratedContent('email')}>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400"><Mail size={18} className="text-blue-500" /> 12 PM Email</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Generate HTML table or Python script.</p>
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 transition cursor-pointer group" onClick={() => setGeneratedContent('teams-start')}>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400"><MessageSquare size={18} className="text-purple-500" /> Day Start Post</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate "Today's Plan" text for Teams.</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 transition cursor-pointer group" onClick={() => setGeneratedContent('teams-end')}>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400"><MessageSquare size={18} className="text-purple-600" /> Day End Post</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate "Today's Actuals" text for Teams.</p>
        </div>
        {isManagerView && (
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500 transition cursor-pointer group" onClick={() => setGeneratedContent('reminders')}>
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-2 group-hover:text-red-600 dark:group-hover:text-red-400"><Bell size={18} className="text-red-500" /> Reminders</h3>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{missingUsers.length}</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs mb-1">pending</span>
            </div>
          </div>
        )}
      </div>

      {isManagerView && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Weekly submission rate</p>
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{weeklyTrend.submittedPct.toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Avg planned vs actual</p>
            <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
              Planned: <strong>{weeklyTrend.avgPlannedHours.toFixed(2)}h</strong> | Actual: <strong>{weeklyTrend.avgActualHours.toFixed(2)}h</strong>
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Top blockers (weekly)</p>
            <ul className="mt-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
              {weeklyTrend.topBlockers.length === 0 && <li>No blocker reasons captured</li>}
              {weeklyTrend.topBlockers.map(([reason, count]) => (
                <li key={reason}>{reason} ({count})</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isManagerView && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Role-based reminder schedules</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            For Scrum Master/Admin sessions, reminders auto-trigger at 11:30 and 18:30 (local browser time) when pending updates exist.
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded p-3 text-sm"><strong>11:30</strong> – Day-start reminder</div>
            <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded p-3 text-sm"><strong>18:30</strong> – Day-end reminder</div>
            <button
              onClick={() => copyToClipboard(generateReminderText())}
              className="bg-indigo-600 text-white rounded p-3 text-sm font-semibold hover:bg-indigo-700"
            >
              Copy current reminder
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <input
              type="text"
              value={teamsReminderConfig.recipients}
              onChange={(e) => setTeamsReminderConfig((prev) => ({ ...prev, recipients: e.target.value }))}
              placeholder="Recipient mail IDs (comma-separated)"
              className={`md:col-span-2 ${inputBase}`}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
            Auto-reminder opens an email draft when dashboard is open at 11:30 / 18:30 and recipients are configured.
          </p>
        </div>
      )}

      {isManagerView && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase w-1/3">Day Start Data</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase w-1/3">Day End Data</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((u) => {
                  const row = dailyData.find(d => d.userId === u.id);
                  const isLeave = row?.status === 'LEAVE';

                  return (
                    <tr key={u.id} className={row?.approved ? 'bg-green-50/30 dark:bg-green-900/10' : (isLeave ? 'bg-amber-50/50 dark:bg-amber-900/10' : (!row ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''))}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold ${row ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{u.name}</div>
                        {isLeave && <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-bold mt-1 inline-block">ON LEAVE</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {isLeave ? '-' : row ? (
                          <div className="space-y-2">
                            <div>
                              <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500">Yesterday</p>
                              <ul className="list-disc pl-4 space-y-1">
                                {(row.yesterdayWork || []).map((t, i) => (
                                  <li key={i}>
                                    {t.task}
                                    <span className="text-xs text-slate-400"> ({t.project || '-'} • {t.time} • {t.priority || 'Medium'})</span>
                                    {t.blockerReason ? <span className="text-xs text-red-500 dark:text-red-400"> - {t.blockerReason}</span> : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500">Today's Plan</p>
                              <ul className="list-disc pl-4 space-y-1">
                                {(row.todayPlan || []).map((t, i) => (
                                  <li key={i}>
                                    {t.task}
                                    <span className="text-xs text-slate-400"> ({t.project || '-'} • {t.time} • {t.priority || 'Medium'})</span>
                                    {t.blockerReason ? <span className="text-xs text-red-500 dark:text-red-400"> - {t.blockerReason}</span> : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : <span className="text-xs text-slate-300 dark:text-slate-600 italic">Not Submitted</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {isLeave ? '-' : row ? (
                          <ul className="list-disc pl-4 space-y-1">
                            {(row.todayActuals || []).length === 0 && <li className="text-xs text-slate-400 list-none">No day-end actuals captured</li>}
                            {(row.todayActuals || []).map((t, i) => (
                              <li key={i}>
                                {t.task}
                                <span className="text-xs text-slate-400"> ({t.project || '-'} • {t.actualTime || t.time || '-'} • {t.priority || 'Medium'} • {t.status || 'Completed'})</span>
                                {t.blockerReason ? <span className="text-xs text-red-500 dark:text-red-400"> - {t.blockerReason}</span> : null}
                              </li>
                            ))}
                          </ul>
                        ) : <span className="text-xs text-slate-300 dark:text-slate-600 italic">Not Submitted</span>}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isManagerView && row && !isLeave && (
                          <button
                            onClick={() => toggleApproval(row.id, row.approved)}
                            className={`p-2 rounded-full transition-colors ${row.approved ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                          >
                            <ShieldCheck size={20} />
                          </button>
                        )}
                        {isManagerView && !row && (
                          <button
                            onClick={() => markAsLeave(u)}
                            className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-1 rounded hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
                          >
                            Mark Leave
                          </button>
                        )}
                        {!isManagerView && <span className="text-xs text-slate-300 dark:text-slate-600">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generatedContent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                {generatedContent === 'email' ? 'Email & Python Automation' :
                  generatedContent === 'reminders' ? 'Send Reminders' : 'Teams Post'}
              </h3>
              <button onClick={() => setGeneratedContent(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white"><LogOut size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900 flex-1">
              {generatedContent === 'reminders' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded shadow">
                  <h4 className="font-bold mb-4 text-slate-700 dark:text-slate-200">Missing Submissions:</h4>
                  <div className="space-y-3 mb-6">
                    {missingUsers.length === 0 ? <p className="text-green-600 dark:text-green-400">All caught up!</p> : missingUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded border border-slate-100 dark:border-slate-600">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} className="text-amber-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-200">{u.name}</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(`Hello @${u.name}, gentle reminder to update your scrum status for today.`)}
                          className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded flex items-center gap-1 transition"
                          title="Copy reminder for this person"
                        >
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    ))}
                  </div>
                  {missingUsers.length > 0 && (
                    <button onClick={() => copyToClipboard(generateReminderText())} className="w-full py-3 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow flex items-center justify-center gap-2 transition">
                      <Bell size={18} /> Copy Group Reminder
                    </button>
                  )}
                </div>
              )}

              {generatedContent === 'email' && (
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded shadow border-l-4 border-green-500">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <Download size={18} className="text-green-600 dark:text-green-400" /> Send via Python Script (Outlook)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Downloads a script that uses your local Outlook Desktop app to send the report.</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input type="text" placeholder="Your Email" className={inputBase} value={emailConfig.address} onChange={e => setEmailConfig({ ...emailConfig, address: e.target.value })} />
                      <input type="text" placeholder="Recipient Emails (comma separated)" className={`col-span-2 ${inputBase}`} value={emailConfig.to} onChange={e => setEmailConfig({ ...emailConfig, to: e.target.value })} />
                    </div>
                    <button onClick={downloadPythonScript} className="w-full py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 text-sm">Download .py Script</button>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded shadow">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200">HTML Preview</h4>
                      <button onClick={() => copyHtmlToClipboard('email-template')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Copy Content</button>
                    </div>
                    <div id="email-template" className="font-sans border dark:border-slate-600 p-4 bg-slate-50 dark:bg-slate-900 text-sm overflow-auto max-h-64 text-slate-800 dark:text-slate-200">
                      <p>Hi Team,</p>
                      <p>Please find the scrum status for today.</p>
                      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead><tr style={{ backgroundColor: '#1e3a8a', color: 'white' }}><th className="p-2 text-left border dark:border-slate-600">Member</th><th className="p-2 text-left border dark:border-slate-600">Yesterday</th><th className="p-2 text-left border dark:border-slate-600">Today</th></tr></thead>
                        <tbody>
                          {dailyData.map((row, idx) => {
                            const bg = idx % 2 === 0 ? 'transparent' : 'rgba(148, 163, 184, 0.1)';
                            if (row.status === 'LEAVE') {
                              return (
                                <tr key={idx} style={{ backgroundColor: bg }}>
                                  <td className="p-2 border dark:border-slate-600 font-bold">{row.userName}</td>
                                  <td colSpan="2" style={{ padding: '8px', textAlign: 'center', backgroundColor: 'rgba(253, 230, 138, 0.2)', color: '#B45309', fontWeight: 'bold', border: '1px solid #e5e7eb' }}>ON LEAVE</td>
                                </tr>
                              );
                            }
                            return (
                              <tr key={idx} style={{ backgroundColor: bg }}>
                                <td className="p-2 border dark:border-slate-600 font-bold">{row.userName}</td>
                                <td className="p-2 border dark:border-slate-600"><ul>{(row.yesterdayWork || []).filter(t => t.task?.trim()).map(t => <li>{t.task}</li>)}</ul></td>
                                <td className="p-2 border dark:border-slate-600"><ul>{(row.todayPlan || []).filter(t => t.task?.trim()).map(t => <li>{t.task}</li>)}</ul></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <p>Thanks,<br />{currentSM.name}</p>
                    </div>
                  </div>
                </div>
              )}

              {generatedContent?.includes('teams') && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded shadow h-full flex flex-col">
                  <div className="mb-3 grid md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={teamsWebhookUrl}
                      onChange={(e) => setTeamsWebhookUrl(e.target.value)}
                      placeholder="Microsoft Teams Incoming Webhook URL"
                      className={`md:col-span-3 ${inputBase}`}
                    />
                    <button
                      onClick={() => sendTeamsWebhook(generatedContent === 'teams-start' ? 'start' : 'end')}
                      className="bg-blue-600 text-white rounded px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                    >
                      Post to Teams
                    </button>
                  </div>
                  <textarea
                    readOnly
                    className={`flex-1 w-full p-4 font-mono text-sm resize-none ${inputBase}`}
                    value={generateTeamsText(generatedContent === 'teams-start' ? 'start' : 'end')}
                  />
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => copyToClipboard(generateTeamsText(generatedContent === 'teams-start' ? 'start' : 'end'))} className="flex-1 py-3 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 shadow flex items-center justify-center gap-2">
                      <Copy size={18} /> Copy Text
                    </button>
                    <a href="https://teams.microsoft.com" target="_blank" rel="noopener noreferrer" className="flex-1 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded font-bold hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm flex items-center justify-center gap-2 no-underline">
                      <ExternalLink size={18} /> Open Teams
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VIEW 3: Reports ---
function ReportsView({ data }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const filteredData = useMemo(() => {
    return data.filter(d => d.date.startsWith(month)).filter((doc) => {
      if (doc.status === 'LEAVE') return true;
      const hasYesterday = (doc.yesterdayWork || []).some((task) => (task.task || '').trim());
      const hasPlan = (doc.todayPlan || []).some((task) => (task.task || '').trim());
      const hasActual = (doc.todayActuals || []).some((task) => (task.task || '').trim());
      return hasYesterday || hasPlan || hasActual;
    });
  }, [data, month]);

  const downloadExcel = async () => {
    if (filteredData.length === 0) {
      alert("No valid data found for selected month.");
      return;
    }
    if (!window.ExcelJS) {
      alert("Excel export library is loading. Please wait a moment and try again.");
      return;
    }

    const workbook = new window.ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('StreetMan Scrum Report');

    sheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: "Yesterday's Work", key: 'yesterday_summary', width: 45 },
      { header: "Today's Plan", key: 'plan_summary', width: 45 },
      { header: 'Hardware Tasks', key: 'hw_task', width: 40 },
      { header: 'Duration', key: 'hw_time', width: 10 },
      { header: 'SMNGUI Tasks', key: 'gui_task', width: 40 },
      { header: 'Duration', key: 'gui_time', width: 10 },
      { header: 'SM Core Tasks', key: 'core_task', width: 40 },
      { header: 'Duration', key: 'core_time', width: 10 },
    ];

    const headerRow = sheet.getRow(1);
    for (let i = 1; i <= 10; i++) {
      const cell = headerRow.getCell(i);
      cell.value = sheet.columns[i - 1].header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }

    filteredData.forEach(doc => {
      const buckets = {
        'Hardware': { tasks: [], minutes: 0 },
        'SMNGUI': { tasks: [], minutes: 0 },
        'SM Core': { tasks: [], minutes: 0 }
      };

      if (doc.status !== 'LEAVE') {
        (doc.yesterdayWork || []).forEach(task => {
          if (!task.task || !task.task.trim()) return;
          const category = PROJECT_CATEGORIES[task.project] || 'SM Core';
          buckets[category].tasks.push(task.task);
          buckets[category].minutes += parseDurationToMinutes(task.time);
        });
      }

      const formatTasks = (tasks) => tasks.length > 0 ? tasks.map(t => `• ${t}`).join('\n') : '-';
      const safeTime = (minutes) => minutes > 0 ? formatMinutesToDuration(minutes) : '-';

      const rowValues = {
        date: doc.date,
        name: doc.userName,
        yesterday_summary: formatTasks((doc.yesterdayWork || []).filter(t => t.task?.trim()).map(t => `${t.task} (${t.time || '-'})`)),
        plan_summary: formatTasks((doc.todayPlan || []).filter(t => t.task?.trim()).map(t => `${t.task} (${t.time || '-'})`)),
        hw_task: formatTasks(buckets['Hardware'].tasks),
        hw_time: safeTime(buckets['Hardware'].minutes),
        gui_task: formatTasks(buckets['SMNGUI'].tasks),
        gui_time: safeTime(buckets['SMNGUI'].minutes),
        core_task: formatTasks(buckets['SM Core'].tasks),
        core_time: safeTime(buckets['SM Core'].minutes)
      };

      const row = sheet.addRow(Object.values(rowValues));

      if (doc.status === 'LEAVE') {
        sheet.mergeCells(row.number, 3, row.number, 10);
        const cell = sheet.getCell(row.number, 3);
        cell.value = "ON LEAVE";
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.font = { color: { argb: 'FF000000' }, bold: true };
        for (let i = 1; i <= 10; i++) {
          const c = row.getCell(i);
          c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (i >= 3) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        }
      } else {
        [3, 4, 5, 7, 9].forEach(colIdx => {
          sheet.getCell(row.number, colIdx).alignment = { wrapText: true, vertical: 'top' };
        });
        [6, 8, 10].forEach(colIdx => {
          sheet.getCell(row.number, colIdx).alignment = { horizontal: 'center', vertical: 'top' };
        });

        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `StreetMan_Report_${month}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Monthly Timesheet</h2>
          <p className="text-slate-500 dark:text-slate-400">Export detailed breakdown by project category.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={inputBase}
          />
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
          >
            <FileSpreadsheet size={18} /> Export Excel (Detailed)
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden p-8 text-center text-slate-500 dark:text-slate-400">
        <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <p>Select a month and click Export to download the formatted Excel report.</p>
      </div>
    </div>
  );
}

// --- VIEW 4: Audit Logs ---
function AuditLogsView({ data }) {
  const sortedLogs = [...data].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <History className="text-indigo-600" /> System Audit Logs
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Track actions and status updates dynamically.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 relative">
            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Date</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Approved</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {sortedLogs.map((log) => {
                let actionText = "Updated Status";
                if (log.status === 'LEAVE') actionText = "Marked as Leave";
                else if (log.createdAt === log.updatedAt) actionText = "Submitted New Status";

                return (
                  <tr key={`${log.id}-${log.updatedAt}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {new Date(log.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{log.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full 
                        ${actionText === 'Submitted New Status' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                          actionText === 'Marked as Leave' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                            'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'}`}>
                        {actionText}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {log.approved ? (
                        <span className="inline-flex text-green-600 dark:text-green-400"><CheckCircle2 size={18} /></span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400 italic">No logs available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- VIEW 5: Admin Panel ---
function AdminView({ users, setUsers, config, setConfig }) {
  const [newMember, setNewMember] = useState({ id: '', name: '', team: MEMBER_TEAMS[0], pin: '' });

  const handleAssign = (userId) => {
    if (window.confirm("Confirm: Assign this user as the new Weekly Scrum Master?")) {
      setConfig({ ...config, currentScrumMasterId: userId });
      alert("Scrum Master Updated Successfully!");
    }
  };

  const handleAddMember = () => {
    const payload = {
      id: newMember.id.trim(),
      name: newMember.name.trim(),
      team: newMember.team,
      pin: newMember.pin.trim(),
      role: 'MEMBER'
    };

    if (!payload.id || !payload.name || !payload.pin) {
      alert('Please enter member id, name and PIN.');
      return;
    }
    if (users.some((u) => u.id === payload.id)) {
      alert('Member ID already exists. Use a unique ID.');
      return;
    }
    if (users.some((u) => u.pin === payload.pin)) {
      alert('PIN already used. Use a unique PIN for each member.');
      return;
    }

    setUsers((prev) => [...prev, payload]);
    setNewMember({ id: '', name: '', team: MEMBER_TEAMS[0], pin: '' });
    alert('New member added successfully.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserCog /> Admin Control Panel
        </h2>
        <p className="text-indigo-200 mt-2 text-sm">Manage weekly roles and rotation.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New Member</h3>
        <div className="grid md:grid-cols-4 gap-3 mb-8">
          <input
            type="text"
            placeholder="Member ID"
            className={inputBase}
            value={newMember.id}
            onChange={(e) => setNewMember((prev) => ({ ...prev, id: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Member name"
            className={inputBase}
            value={newMember.name}
            onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className={inputBase}
            value={newMember.team}
            onChange={(e) => setNewMember((prev) => ({ ...prev, team: e.target.value }))}
          >
            {MEMBER_TEAMS.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>
          <input
            type="password"
            placeholder="Unique PIN"
            className={inputBase}
            value={newMember.pin}
            onChange={(e) => setNewMember((prev) => ({ ...prev, pin: e.target.value }))}
          />
        </div>
        <button
          onClick={handleAddMember}
          className="mb-8 bg-indigo-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-indigo-700"
        >
          Add Member
        </button>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Assign Weekly Scrum Master</h3>
        <div className="space-y-2">
          {users.filter(u => u.role !== 'ADMIN').map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{user.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.team}</p>
                </div>
              </div>
              {config.currentScrumMasterId === user.id ? (
                <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                  Current Master
                </span>
              ) : (
                <button
                  onClick={() => handleAssign(user.id)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded transition"
                >
                  Assign
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}