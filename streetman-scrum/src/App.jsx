import React, { useState, useEffect, useMemo, useRef } from 'react';
// SQLite migration note:
// Firebase imports intentionally commented per request (do not remove).
import {
  LayoutDashboard, PlusCircle, Users, FileSpreadsheet, Copy, Mail, MessageSquare,
  LogOut, X, ChevronDown, CheckCircle2, AlertTriangle, Lock, ShieldCheck, UserCog,
  Clock, CalendarCheck, WifiOff, CloudLightning, Database, RefreshCw, Send, Activity,
  Calendar, Tag, Trash2, Edit3, User, ExternalLink, Download, Bell, Coffee, History, Search, Filter,
  ImageIcon, Layers, GitCommit, KanbanSquare
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

let configError = null;

const appId = "streetman-scrum-automation";

// --- NEW SERVER CONFIGURATION ---
const BACKEND_URL = 'http://192.168.26.210:3001';

// --- TEAM CONFIGURATION ---
const PROJECTS = ['SMNGUI', 'Hardware', 'Core', 'SandC', 'AWS', 'CST'];
const MEMBER_TEAMS = ['StreetMan QA', 'StreetMan Dev', 'Hardware', 'StreetMan NexGen Dev'];

// PROJECT MAPPING FOR EXPORT
const PROJECT_CATEGORIES = {
  'Hardware': 'Hardware',
  'SMNGUI': 'SMNGUI',
  'Core': 'Core',
  'SandC': 'SandC',
  'AWS': 'AWS',
  'CST': 'CST'
};
const PROJECT_OPTIONS = [...Object.keys(PROJECT_CATEGORIES), 'Others'];

const SYSTEM_DATA_STORAGE_KEY = 'streetman_system_data';
const JIRA_PATTERN = /[A-Z]{2,}-\d+/g;

// HARDCODED TEAM MEMBERS
const DEFAULT_USERS = [
  { id: '1349', name: 'Ravichandran C', team: 'StreetMan QA', role: 'ADMIN', pin: '1349' },
  { id: '1253', name: 'Keerthana M', team: 'StreetMan QA', role: 'MEMBER', pin: '1253' },
  { id: '1266', name: 'Mani Rathinam S', team: 'StreetMan QA', role: 'MEMBER', pin: '1266' },
  { id: '1252', name: 'Karthika S', team: 'StreetMan QA', role: 'MEMBER', pin: '1252' },
  { id: '1342', name: 'Vignesh S', team: 'StreetMan QA', role: 'MEMBER', pin: '1342' },
  { id: '1220', name: 'Shanmugam S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1220' },
  { id: '1312', name: 'Keerthana Sharavanan', team: 'StreetMan Dev', role: 'MEMBER', pin: '1312' },
  { id: '1316', name: 'Gobi S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1316' },
  { id: '1335', name: 'Surendhar S', team: 'StreetMan Dev', role: 'MEMBER', pin: '1335' },
  { id: '1345', name: 'Nithish Kumar M', team: 'StreetMan Dev', role: 'MEMBER', pin: '1345' },
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
    try { return crypto.randomUUID(); } catch (e) { }
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

const toExcelColumn = (index) => {
  let column = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    index = Math.floor((index - 1) / 26);
  }
  return column;
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

const parseTaskListFromText = (text) => {
  const rawLines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (rawLines.length <= 1) return rawLines;
  const items = rawLines.reduce((acc, line) => {
    const cleaned = line.replace(/^([\u2022\-\*\d+\.]+)\s*/, '').trim();
    if (cleaned) acc.push(cleaned);
    return acc;
  }, []);
  return items.length > 0 ? items : rawLines;
};

const extractJiraId = (text) => {
  if (!text) return '';
  const match = text.match(JIRA_PATTERN);
  return match ? match[0] : '';
};

const getISTString = (dateValue = new Date()) => {
  return new Date(dateValue).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
};

const getWeekStartDate = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().split('T')[0];
};

const buildOutlookEmailHtml = (selectedDate, currentSM, dailyData) => {
  const generatedOn = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) + ' IST';

  let htmlTable = `
    <div style="max-width: 900px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="background-color: #f8fafc; border: 1px solid #1e3a8a; border-radius: 8px 8px 0 0; overflow: hidden;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-spacing: 0;">
          <tr>
            <td style="width: 6px; background-color: #1e3a8a;"></td>
            <td style="padding: 20px 24px; background-color: #1e3a8a;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700; text-align: center;">StreetMan Scrum Status</h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; text-align: center;">Daily Standup Report</p>
            </td>
          </tr>
        </table>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border-top: 1px solid #1e3a8a; background-color: #f0f4ff;">
        <tr>
          <td style="padding: 16px 20px; vertical-align: top; width: 50%;">
            <p style="margin: 0; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Report Date</p>
            <p style="margin: 4px 0 0 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">${formatDate(selectedDate)}</p>
          </td>
          <td style="padding: 16px 20px; vertical-align: top; width: 50%; text-align: right;">
            <p style="margin: 0; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Scrum Master</p>
            <p style="margin: 4px 0 0 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">${currentSM?.name || 'N/A'}</p>
          </td>
        </tr>
      </table>
      <div style="padding: 24px 20px; background: white;">
        <p style="margin: 0 0 20px 0; color: #555; font-size: 15px;">Hi Team,</p>
        <p style="margin: 0 0 24px 0; color: #555; font-size: 15px;">Please find the scrum status summary below.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background-color: #1e3a8a; color: white;">
              <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; border-bottom: 3px solid #1e3a8a; letter-spacing: 0.5px; white-space: nowrap;">Team Member</th>
              <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; border-bottom: 3px solid #1e3a8a; letter-spacing: 0.5px; white-space: nowrap;">Yesterday's Work</th>
              <th style="padding: 14px 12px; text-align: left; font-weight: 700; font-size: 14px; border-bottom: 3px solid #1e3a8a; letter-spacing: 0.5px; white-space: nowrap;">Today's Plan</th>
            </tr>
          </thead>
          <tbody>`;

  dailyData.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafb';
    const borderColor = idx === dailyData.length - 1 ? '2px solid #e5e7eb' : '1px solid #e5e7eb';
    if (row.status === 'LEAVE') {
      htmlTable += `<tr style="background-color: ${bg};">
        <td style="padding: 14px 12px; border-bottom: ${borderColor}; font-weight: 600; color: #1e3a8a;">${row.userName}</td>
        <td style="padding: 14px 12px; border-bottom: ${borderColor}; text-align: center; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; font-weight: 600;" colspan="2">🏖️ ON LEAVE</td>
      </tr>`;
    } else if (
      (!row.yesterdayWork || row.yesterdayWork.length === 0) &&
      (!row.todayPlan || row.todayPlan.length === 0)
    ) {
      htmlTable += `<tr style="background-color: ${bg};">
    <td style="padding: 14px 12px; border-bottom: ${borderColor}; font-weight: 600; color: #1e3a8a;">
      ${row.userName}
    </td>
    <td style="padding: 14px 12px; border-bottom: ${borderColor}; text-align: center; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b; font-weight: 600;" colspan="2">
      ⚠️ NOT FILLED
    </td>
  </tr>`;
    } else {
      const yesterday = row.yesterdayWork.length > 0
        ? row.yesterdayWork.map(t => `<li style="margin: 4px 0; color: #333; font-size: 14px;">${t.task}</li>`).join('')
        : '<li style="margin: 4px 0; color: #999; font-size: 14px; font-style: italic;">No tasks tracked</li>';
      const today = row.todayPlan.length > 0
        ? row.todayPlan.map(t => `<li style="margin: 4px 0; color: #333; font-size: 14px;">${t.task}</li>`).join('')
        : '<li style="margin: 4px 0; color: #999; font-size: 14px; font-style: italic;">No tasks planned</li>';

      htmlTable += `<tr style="background-color: ${bg}; transition: background-color 0.2s;">
        <td style="padding: 14px 12px; border-bottom: ${borderColor}; font-weight: 600; color: #1e3a8a;">${row.userName}</td>
        <td style="padding: 14px 12px; border-bottom: ${borderColor};"><ul style="margin: 0; padding-left: 20px;">${yesterday}</ul></td>
        <td style="padding: 14px 12px; border-bottom: ${borderColor};"><ul style="margin: 0; padding-left: 20px;">${today}</ul></td>
      </tr>`;
    }
  });

  htmlTable += `</tbody>
        </table>
      </div>
      <div style="padding: 20px 20px 0 20px; background: #f9fafb; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 15px; font-weight: 700;">Thanks,</p>
        <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px;">${currentSM?.name || 'StreetMan Scrum Automation'}</p>
      </div>
      <div style="background: #0f172a; padding: 24px 20px; text-align: center; color: #cbd5e1; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #f8fafc;">StreetMan Scrum Automation</p>
        <p style="margin: 0 0 16px 0; font-size: 12px; color: #94a3b8;">Automated daily standup reporting system</p>
        <div style="margin: 0 auto 16px auto; width: 48px; height: 2px; background: rgba(255,255,255,0.16);"></div>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">Generated on ${generatedOn}</p>
      </div>
    </div>`;

  return htmlTable;
};

// --- GLOBAL STYLES ---
const inputBase = "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm px-3 py-2 outline-none transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-indigo-400 dark:focus:ring-offset-1 focus:border-indigo-500 rounded-lg disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm hover:shadow-md";

// Material Design CSS animations (injected into page head)
const materialDesignStyles = `
  <style>
    @keyframes ripple {
      from {
        background-size: 100% 100%;
      }
      to {
        background-size: 0 0;
      }
    }
    
    @keyframes slideInFromRight {
      from {
        transform: translateX(20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideInFromBottom {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    .ripple-button {
      position: relative;
      overflow: hidden;
      background-position: center;
      transition: background 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    
    .ripple-button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    
    .ripple-button:active::before {
      width: 300px;
      height: 300px;
      animation: ripple 0.6s ease-out;
    }
    
    .card-elevation {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.06);
      transition: box-shadow 0.2s ease;
    }
    
    .card-elevation:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.1);
    }
  </style>
`;

// --- CUSTOM COMPONENTS ---
const AutoResizeTextarea = ({ value, onChange, onPaste, placeholder, disabled, className }) => {
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
      onPaste={onPaste}
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

// --- NOTIFICATION COMPONENT ---
const Notification = ({ show, type, message }) => {
  if (!show) return null;

  const stylesByType = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      border: 'border-emerald-200 dark:border-emerald-700',
      icon: '✓',
      iconBg: 'bg-emerald-100 dark:bg-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-200',
      title: 'text-emerald-900 dark:text-emerald-100'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-700',
      icon: '✕',
      iconBg: 'bg-red-100 dark:bg-red-800',
      text: 'text-red-800 dark:text-red-200',
      title: 'text-red-900 dark:text-red-100'
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/30',
      border: 'border-amber-200 dark:border-amber-700',
      icon: '!',
      iconBg: 'bg-amber-100 dark:bg-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      title: 'text-amber-900 dark:text-amber-100'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-200 dark:border-blue-700',
      icon: 'ℹ',
      iconBg: 'bg-blue-100 dark:bg-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      title: 'text-blue-900 dark:text-blue-100'
    }
  };

  const styles = stylesByType[type] || stylesByType.info;

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-5 duration-300`}>
      <div className={`${styles.bg} border ${styles.border} rounded-lg shadow-lg p-4 max-w-sm`}>
        <div className="flex gap-4">
          <div className={`${styles.iconBg} rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold ${styles.title}`}>
            {styles.icon}
          </div>
          <div className="flex-1 py-1">
            <p className={`${styles.title} font-semibold text-sm mb-1 capitalize`}>{type}</p>
            <p className={`${styles.text} text-sm leading-relaxed`}>{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppModal = ({ open, type, title, message, inputValue, placeholder, inputType, onChange, onClose, onSubmit }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open, type]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title || 'Confirmation'}</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
          {type === 'prompt' && (
            <input
              ref={inputRef}
              type={inputType || 'text'}
              value={inputValue}
              placeholder={placeholder || ''}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-500/20"
            />
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700">
          <button onClick={onClose} className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
          <button onClick={onSubmit} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login');
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [modalState, setModalState] = useState({ open: false, mode: 'confirm', title: '', message: '', inputValue: '', placeholder: '', inputType: 'text' });
  const modalResolver = useRef(null);
  const defaultSystemData = useMemo(() => ({
    appConfig: { currentScrumMasterId: '1349' },
    auditLogs: [],
    users: DEFAULT_USERS,
    customProjects: [],
    teams: MEMBER_TEAMS,
    teamsReminderConfig: { recipients: '' },
    reminderTriggers: {}
  }), []);
  const systemDataRef = useRef(defaultSystemData);
  const mergeSystemData = (incoming) => {
    const inc = incoming || {};
    return {
      ...defaultSystemData,
      ...systemDataRef.current,
      ...inc,
      appConfig: {
        ...defaultSystemData.appConfig,
        ...(systemDataRef.current?.appConfig || {}),
        ...(inc.appConfig || {})
      }
    };
  };

  const normalizeSystemData = (raw) => {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[raw.length - 1] || null;
    if (raw[SYSTEM_DATA_STORAGE_KEY]) return raw[SYSTEM_DATA_STORAGE_KEY];
    if (raw.value && typeof raw.value === 'object') return raw.value;
    if (raw.data && typeof raw.data === 'object') return raw.data;
    return raw;
  };
  // SERVER SYNC HELPER - Gracefully falls back if backend endpoint doesn't exist
  const syncSystemData = async (payload) => {
    const mergedPayload = mergeSystemData(payload);
    systemDataRef.current = mergedPayload;
    try {
      localStorage.setItem('scrum_system_data_backup', JSON.stringify(mergedPayload));
    } catch (e) { }
    try {
      await fetch(`${BACKEND_URL}/api/system-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mergedPayload,
          [SYSTEM_DATA_STORAGE_KEY]: mergedPayload
        })
      });
    } catch (e) {
      // Backend route /api/system-data not configured yet
    }
  };

  // WRAPPED STATE SETTERS (Automatically pushes to backend DB)
  const [appConfigState, setAppConfigState] = useState(defaultSystemData.appConfig);

  const setAppConfig = (value) => {
    setAppConfigState(prev => {
      const newConfig = typeof value === 'function' ? value(prev) : value;
      setTimeout(() => syncSystemData({ appConfig: newConfig }), 0);
      return newConfig;
    });
  };

  const [auditLogsState, setAuditLogsState] = useState(defaultSystemData.auditLogs);

  const setAuditLogs = (value) => {
    setAuditLogsState(prev => {
      const newLogs = typeof value === 'function' ? value(prev) : value;
      setTimeout(() => syncSystemData({ auditLogs: newLogs }), 0);
      return newLogs;
    });
  };

  const [usersState, setUsersState] = useState(defaultSystemData.users);

  const setUsers = (value) => {
    setUsersState(prev => {
      const newUsers = typeof value === 'function' ? value(prev) : value;
      setTimeout(() => syncSystemData({ users: newUsers }), 0);
      return newUsers;
    });
  };

  const [customProjects, setCustomProjectsState] = useState(defaultSystemData.customProjects);
  const setCustomProjects = (value) => {
    setCustomProjectsState(prev => {
      const newProjects = typeof value === 'function' ? value(prev) : value;
      setTimeout(() => syncSystemData({ customProjects: newProjects }), 0);
      return newProjects;
    });
  };

  const [teamsState, setTeamsStateInternal] = useState(defaultSystemData.teams);
  const setTeams = (value) => {
    setTeamsStateInternal(prev => {
      const newTeams = typeof value === 'function' ? value(prev) : value;
      setTimeout(() => syncSystemData({ teams: newTeams }), 0);
      return newTeams;
    });
  };

  const [teamsReminderConfig, setTeamsReminderConfigState] = useState(defaultSystemData.teamsReminderConfig);
  const setTeamsReminderConfig = (value) => {
    setTeamsReminderConfigState(prev => {
      const newConfig = typeof value === 'function' ? value(prev) : value;
      setTimeout(() => syncSystemData({ teamsReminderConfig: newConfig }), 0);
      return newConfig;
    });
  };

  const [reminderTriggers, setReminderTriggersState] = useState(defaultSystemData.reminderTriggers);
  const markReminderTriggered = (key) => {
    setReminderTriggersState((prev) => {
      if (prev[key]) return prev;
      const next = { ...prev, [key]: '1' };
      syncSystemData({ reminderTriggers: next });
      return next;
    });
  };

  const [statusData, setStatusData] = useState([]);

  const [authError, setAuthError] = useState(null);
  const [dbError, setDbError] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: 'info', message: '' });

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    const timer = setTimeout(() => setNotification({ show: false, type: 'info', message: '' }), 3500);
    return timer;
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
    if (modalResolver.current) {
      modalResolver.current(false);
      modalResolver.current = null;
    }
  };

  const showConfirm = (message, title = 'Confirm Action') => new Promise((resolve) => {
    modalResolver.current = resolve;
    setModalState({ open: true, mode: 'confirm', title, message, inputValue: '', placeholder: '', inputType: 'text' });
  });

  const showPrompt = (message, title = 'Enter value', placeholder = '', inputType = 'text') => new Promise((resolve) => {
    modalResolver.current = resolve;
    setModalState({ open: true, mode: 'prompt', title, message, inputValue: '', placeholder, inputType });
  });

  const handleModalSubmit = () => {
    const value = modalState.mode === 'prompt' ? modalState.inputValue : true;
    setModalState((prev) => ({ ...prev, open: false }));
    if (modalResolver.current) {
      modalResolver.current(value);
      modalResolver.current = null;
    }
  };

  const handleModalChange = (value) => {
    setModalState((prev) => ({ ...prev, inputValue: value }));
  };

  const isAdmin = currentUserProfile?.role === 'ADMIN';
  const isScrumMaster = currentUserProfile?.id === appConfigState.currentScrumMasterId || isAdmin;

  const recordAudit = ({ userName, action, targetDate, details }) => {
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      userName,
      action,
      targetDate: targetDate || getTodayString(),
      details: details || ''
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

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

    const fetchSystemData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/system-data`);
        let normalized = null;
        if (res.ok) {
          const rawData = await res.json();
          normalized = normalizeSystemData(rawData);
        }

        if (!normalized || Object.keys(normalized).length === 0) {
          const localBackup = localStorage.getItem('scrum_system_data_backup');
          if (localBackup) normalized = JSON.parse(localBackup);
        } else {
          // Prevent server restart from wiping out SM assignment
          const localBackupStr = localStorage.getItem('scrum_system_data_backup');
          if (localBackupStr) {
            const localBackup = JSON.parse(localBackupStr);
            const serverSmId = normalized.appConfig?.currentScrumMasterId;
            const defaultSmId = defaultSystemData.appConfig.currentScrumMasterId;
            const localSmId = localBackup?.appConfig?.currentScrumMasterId;

            if ((!serverSmId || serverSmId === defaultSmId) && localSmId && localSmId !== defaultSmId) {
              if (!normalized.appConfig) normalized.appConfig = {};
              normalized.appConfig.currentScrumMasterId = localSmId;
            }
            // Also recover custom projects if server lost them
            if ((!normalized.customProjects || normalized.customProjects.length === 0) && localBackup.customProjects?.length > 0) {
              normalized.customProjects = localBackup.customProjects;
            }
          }
        }

        const merged = {
          ...defaultSystemData,
          ...(normalized || {}),
          appConfig: {
            ...defaultSystemData.appConfig,
            ...(normalized?.appConfig || {})
          }
        };

        systemDataRef.current = mergeSystemData(merged);

        if (merged.appConfig?.currentScrumMasterId) {
          setAppConfigState(prev => prev.currentScrumMasterId === merged.appConfig.currentScrumMasterId ? prev : { ...prev, ...merged.appConfig });
        }

        if (Array.isArray(merged.auditLogs)) setAuditLogsState(merged.auditLogs);
        if (Array.isArray(merged.users) && merged.users.length > 0) setUsersState(merged.users);
        if (Array.isArray(merged.customProjects)) setCustomProjectsState(merged.customProjects);
        if (Array.isArray(merged.teams) && merged.teams.length > 0) setTeamsStateInternal(merged.teams);
        if (merged.teamsReminderConfig) setTeamsReminderConfigState(merged.teamsReminderConfig);
        if (merged.reminderTriggers && typeof merged.reminderTriggers === 'object') setReminderTriggersState(merged.reminderTriggers);
      } catch (err) {
        console.warn("Could not fetch /api/system-data", err);
        const localBackup = localStorage.getItem('scrum_system_data_backup');
        if (localBackup) {
          const normalized = JSON.parse(localBackup);
          const merged = {
            ...defaultSystemData,
            ...normalized,
            appConfig: {
              ...defaultSystemData.appConfig,
              ...(normalized?.appConfig || {})
            }
          };
          systemDataRef.current = mergeSystemData(merged);
          if (merged.appConfig?.currentScrumMasterId) {
            setAppConfigState(prev => prev.currentScrumMasterId === merged.appConfig.currentScrumMasterId ? prev : { ...prev, ...merged.appConfig });
          }
          if (Array.isArray(merged.auditLogs)) setAuditLogsState(merged.auditLogs);
          if (Array.isArray(merged.users) && merged.users.length > 0) setUsersState(merged.users);
          if (Array.isArray(merged.customProjects)) setCustomProjectsState(merged.customProjects);
          if (Array.isArray(merged.teams) && merged.teams.length > 0) setTeamsStateInternal(merged.teams);
          if (merged.teamsReminderConfig) setTeamsReminderConfigState(merged.teamsReminderConfig);
          if (merged.reminderTriggers) setReminderTriggersState(merged.reminderTriggers);
        }
      }
    };

    fetchStatuses();
    fetchSystemData();
    const interval = setInterval(() => {
      fetchStatuses();
      fetchSystemData();
    }, 10000);
    return () => clearInterval(interval);
  }, [user, defaultSystemData]);

  // --- HANDLERS ---
  const handleLogin = async (profile) => {
    const pin = await showPrompt(`Enter PIN for ${profile.name}:`, 'Login PIN', 'PIN', 'password');
    if (!pin || pin !== profile.pin) {
      showNotification('error', "Incorrect credentials. Access Denied.");
      return;
    }
    setCurrentUserProfile(profile);
    setActiveTab('input');
    recordAudit({
      userName: profile.name,
      action: 'Logged In',
      targetDate: getTodayString(),
      details: `User ${profile.name} logged in`,
    });
  };

  const handleLogout = () => {
    if (currentUserProfile) {
      recordAudit({
        userName: currentUserProfile.name,
        action: 'Logged Out',
        targetDate: getTodayString(),
        details: `User ${currentUserProfile.name} logged out`,
      });
    }
    setCurrentUserProfile(null);
    setActiveTab('login');
  };

  const handleChangePin = async (profile) => {
    const currentPin = await showPrompt(`Enter current PIN for ${profile.name}:`, 'Current PIN', 'Current PIN', 'password');
    if (!currentPin || currentPin !== profile.pin) {
      showNotification('error', 'Incorrect current PIN.');
      return;
    }
    const newPin = await showPrompt(`Enter new PIN for ${profile.name}:`, 'New PIN', 'New PIN', 'password');
    if (!newPin || newPin.trim().length < 3) {
      showNotification('error', 'New PIN must be at least 3 characters.');
      return;
    }
    const updatedUsers = usersState.map((u) => u.id === profile.id ? { ...u, pin: newPin.trim() } : u);
    setUsers(updatedUsers);
    if (currentUserProfile?.id === profile.id) {
      setCurrentUserProfile({ ...profile, pin: newPin.trim() });
    }
    recordAudit({
      userName: currentUserProfile?.name || profile.name,
      action: 'Changed PIN',
      targetDate: getTodayString(),
      details: currentUserProfile?.id === profile.id ? `Self changed PIN.` : `Changed PIN for ${profile.name}`
    });
    showNotification('success', 'PIN updated successfully.');
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
      <>
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
              {usersState.map(u => (
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
                  {u.id === appConfigState.currentScrumMasterId && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">SM</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AppModal
          open={modalState.open}
          type={modalState.mode}
          title={modalState.title}
          message={modalState.message}
          inputValue={modalState.inputValue}
          placeholder={modalState.placeholder}
          inputType={modalState.inputType}
          onChange={handleModalChange}
          onClose={closeModal}
          onSubmit={handleModalSubmit}
        />
        <Notification show={notification.show} type={notification.type} message={notification.message} />
      </>
    );
  }
  const assignedScrumMaster = usersState.find(u => u.id === appConfigState.currentScrumMasterId) || currentUserProfile;

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
                <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Users size={18} />}>
                  Scrum Board
                </NavButton>
                {(isScrumMaster || isAdmin) && (
                  <>
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
                        {usersState.filter(u => u.id !== currentUserProfile.id).map(u => (
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
                    onClick={() => handleChangePin(currentUserProfile)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/30 flex items-center gap-2"
                  >
                    <Lock size={14} /> Change PIN
                  </button>
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
              recordAudit={recordAudit}
              showConfirm={showConfirm}
              showNotification={showNotification}
            />
          )}
          {activeTab === 'dashboard' && (
            <DashboardView
              data={statusData}
              loggedInUser={currentUserProfile}
              assignedSM={assignedScrumMaster}
              users={usersState}
              canManage={isScrumMaster || isAdmin}
              setStatusData={setStatusData}
              recordAudit={recordAudit}
              showConfirm={showConfirm}
              showNotification={showNotification}
              teamsReminderConfig={teamsReminderConfig}
              setTeamsReminderConfig={setTeamsReminderConfig}
              reminderTriggers={reminderTriggers}
              markReminderTriggered={markReminderTriggered}
            />
          )}
          {activeTab === 'reports' && (isScrumMaster || isAdmin) && <ReportsView data={statusData} showNotification={showNotification} users={usersState} />}
          {activeTab === 'logs' && (isScrumMaster || isAdmin) && <AuditLogsView data={auditLogsState} showNotification={showNotification} />}
          {activeTab === 'admin' && isAdmin && (
            <AdminView
              users={usersState}
              setUsers={setUsers}
              projectsState={customProjects}
              setProjects={setCustomProjects}
              teamsState={teamsState}
              setTeams={setTeams}
              appConfigState={appConfigState}
              setAppConfig={setAppConfig}
              currentUserProfile={currentUserProfile}
              recordAudit={recordAudit}
              handleChangePin={handleChangePin}
              showNotification={showNotification}
              showConfirm={showConfirm}
            />
          )}

          {!isScrumMaster && !isAdmin && activeTab !== 'input' && activeTab !== 'dashboard' && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Lock size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
              <p>Restricted Access. Only Scrum Master/Admin can view this.</p>
            </div>
          )}
        </div>
      </main>

      <Notification show={notification.show} type={notification.type} message={notification.message} />
      <AppModal
        open={modalState.open}
        type={modalState.mode}
        title={modalState.title}
        message={modalState.message}
        inputValue={modalState.inputValue}
        placeholder={modalState.placeholder}
        inputType={modalState.inputType}
        onChange={handleModalChange}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
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
function InputView({ currentUserProfile, existingData, customProjects, setCustomProjects, setStatusData, recordAudit, showConfirm, showNotification }) {
  const [inputDate, setInputDate] = useState(getTodayString());
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const { isDayStartOpen, isDayEndOpen } = checkTimeWindows(inputDate);

  const existingEntry = existingData.find(d => d.date === inputDate && d.userId === currentUserProfile.id);
  const previousEntry = existingData.filter(d => d.userId === currentUserProfile.id && d.date < inputDate).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const isUpdateMode = !!existingEntry;
  const isOnLeave = existingEntry?.status === 'LEAVE';

  const isKarthika = currentUserProfile.name === 'Karthika S';
  const [showNextDay, setShowNextDay] = useState(false);

  const [formData, setFormData] = useState({
    yesterdayWork: [],
    todayPlan: [],
    todayActuals: [],
    nextDayPlan: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const allProjectOptions = useMemo(() => {
    const base = [...PROJECT_OPTIONS];
    const custom = (customProjects || []).filter(p => !base.includes(p));
    const othersIdx = base.indexOf('Others');
    if (othersIdx > -1) {
      base.splice(othersIdx, 0, ...custom);
      return base;
    }
    return [...base, ...custom];
  }, [customProjects]);

  const createTaskItem = (section) => ({
    task: '',
    project: '',
    customProject: '',
    hours: '0',
    minutes: '0',
    priority: 'Medium',
    status: section === 'todayActuals' ? 'Completed' : undefined,
    isBlocked: false,
    blockerReason: '',
    jiraId: ''
  });

  const normalizeProjectValue = (project, customProject) => {
    if (project === 'Others') return customProject.trim() || 'Others';
    return project || '';
  };

  const handleTaskPaste = (section, index, event) => {
    const pastedText = event.clipboardData.getData('text');
    const items = parseTaskListFromText(pastedText);
    if (items.length <= 1) return;

    event.preventDefault();
    setIsDirty(true);
    const currentSection = [...formData[section]];
    currentSection[index].task = items[0];
    const newTasks = items.slice(1).map(() => createTaskItem(section));
    newTasks.forEach((task, idx) => {
      task.task = items[idx + 1];
    });
    const newSection = [...currentSection.slice(0, index + 1), ...newTasks, ...currentSection.slice(index + 1)];
    let newFormData = { ...formData, [section]: newSection };
    if (section === 'todayPlan' && !isDayEndOpen) {
      newFormData.todayActuals = newSection.map(p => ({ ...p, status: 'Completed', isBlocked: false, blockerReason: '' }));
    }
    setFormData(newFormData);
  };

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
      const isKnownProject = allProjectOptions.includes(t.project);
      return {
        ...t,
        hours: parsedTime.hours,
        minutes: parsedTime.minutes,
        project: isKnownProject ? t.project : (t.project ? 'Others' : ''),
        customProject: !isKnownProject && t.project ? t.project : '',
        jiraId: t.jiraId || extractJiraId(t.task),
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
          })),
        nextDayPlan: (existingEntry.nextDayPlan || []).map(t => formatLoadedTask(t, false))
      });
      setShowNextDay(!!existingEntry.nextDayPlan && existingEntry.nextDayPlan.length > 0);
    } else {
      const prevActuals = previousEntry?.todayActuals?.length > 0
        ? previousEntry.todayActuals
        : (previousEntry?.todayPlan || []);
      const autoYesterday = prevActuals
        .filter((task) => (task.task || '').trim())
        .map((t) => ({
          ...formatLoadedTask(t, true),
          status: 'Completed',
          isBlocked: false,
          blockerReason: ''
        }));

      const autoToday = (previousEntry?.nextDayPlan || [])
        .filter(task => (task.task || '').trim())
        .map(t => formatLoadedTask(t, false));

      setFormData({
        yesterdayWork: autoYesterday.length > 0 ? autoYesterday : [createTaskItem('yesterdayWork')],
        todayPlan: autoToday.length > 0 ? autoToday : [createTaskItem('todayPlan')],
        todayActuals: [],
        nextDayPlan: existingEntry?.nextDayPlan?.length > 0 ? existingEntry.nextDayPlan.map(t => formatLoadedTask(t, false)) : [createTaskItem('nextDayPlan')]
      });
      setShowNextDay(false);
    }
    setLoading(false);
  }, [existingEntry, previousEntry, currentUserProfile.id, inputDate, isDirty, allProjectOptions]);

  const handleTaskChange = (section, index, field, value) => {
    setIsDirty(true);
    const newSection = [...formData[section]];
    newSection[index][field] = value;
    if (field === 'task') {
      newSection[index].jiraId = extractJiraId(value);
    }
    if (field === 'project' && value !== 'Others') {
      newSection[index].customProject = '';
    }

    let newFormData = { ...formData, [section]: newSection };
    if (section === 'todayPlan' && !isDayEndOpen) {
      newFormData.todayActuals = newSection.map(p => ({ ...p, status: 'Completed', isBlocked: false, blockerReason: '' }));
    }
    setFormData(newFormData);
  };

  const addTask = (section) => {
    setIsDirty(true);
    const newSection = [...formData[section], createTaskItem(section)];
    let newFormData = { ...formData, [section]: newSection };
    if (section === 'todayPlan' && !isDayEndOpen) {
      newFormData.todayActuals = newSection.map(p => ({ ...p, status: 'Completed', isBlocked: false, blockerReason: '' }));
    }
    setFormData(newFormData);
  };

  const removeTask = (section, index) => {
    if (formData[section].length <= 1) {
      showNotification('error', "You must have at least one task in this section.");
      return;
    }
    setIsDirty(true);
    const newSection = formData[section].filter((_, i) => i !== index);
    let newFormData = { ...formData, [section]: newSection };
    if (section === 'todayPlan' && !isDayEndOpen) {
      newFormData.todayActuals = newSection.map(p => ({ ...p, status: 'Completed', isBlocked: false, blockerReason: '' }));
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDayStartOpen && !isDayEndOpen) {
      showNotification('error', "Status window is closed. You can submit only during allowed day-start/day-end timings.");
      return;
    }
    const blockedWithoutReason = formData.todayActuals.some(
      (task) => task.isBlocked && !(task.blockerReason || '').trim()
    );
    if (blockedWithoutReason) {
      showNotification('error', "Please provide a blocker reason for all checked blocked tasks before saving.");
      return;
    }
    const confirmed = await showConfirm(`Are you sure you want to submit your status for ${formatDate(inputDate)}?`, 'Submit Status');
    if (!confirmed) return;

    setSubmitting(true);
    setMessage(null);
    const now = new Date().toISOString();

    const formatSavedTask = (t, isActuals = false) => {
      const finalProject = normalizeProjectValue(t.project, t.customProject);
      const payload = {
        task: t.task,
        project: finalProject,
        priority: t.priority,
        status: t.status || 'Completed',
        blockerReason: t.isBlocked ? t.blockerReason : '',
        jiraId: t.jiraId || extractJiraId(t.task)
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

    const newCustomProjects = new Set(customProjects || []);
    const checkCustom = (t) => {
      if (t.project === 'Others' && t.customProject?.trim()) newCustomProjects.add(t.customProject.trim());
      else if (t.project && !allProjectOptions.includes(t.project)) newCustomProjects.add(t.project.trim());
    };
    formData.yesterdayWork.forEach(checkCustom);
    formData.todayPlan.forEach(checkCustom);
    formData.todayActuals.forEach(checkCustom);
    if (isKarthika && showNextDay) formData.nextDayPlan.forEach(checkCustom);
    if (newCustomProjects.size > (customProjects || []).length) {
      setCustomProjects(Array.from(newCustomProjects));
    }

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
        nextDayPlan: (isKarthika && showNextDay) ? formData.nextDayPlan.map(t => formatSavedTask(t, false)) : undefined,
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
        recordAudit({
          userName: currentUserProfile.name,
          action: 'Updated Status',
          targetDate: payload.date,
          details: `Updated status with ${payload.todayPlan.length} plan item(s) and ${payload.todayActuals.length} actual item(s).`
        });
      } else {
        setStatusData(prev => [payload, ...prev]);
        recordAudit({
          userName: currentUserProfile.name,
          action: 'Submitted New Status',
          targetDate: payload.date,
          details: `Submitted status with ${payload.todayPlan.length} plan item(s).`
        });
      }

      setIsDirty(false);
      showNotification('success', 'Status Saved Successfully!');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to save status: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  if (isOnLeave) {
    return (
      <div className="max-w-xl mx-auto mt-20 text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-amber-100 dark:border-amber-900/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Coffee size={64} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">You are marked as On Leave</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Enjoy your time off! No status updates required for this day.</p>
      </div>
    );
  }

  // Expanded Container Width
  return (
    <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
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

          <div className={`space-y-4 rounded-2xl p-6 border-2 shadow-md transition-all duration-300 hover:scale-[1.01] card-elevation ${!isDayStartOpen ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-70' : 'bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-900/10 dark:to-slate-900/20 border-blue-200 dark:border-blue-800/40'}`}>
            <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-600 pb-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                1. Day Start Plan
                {!isDayStartOpen && <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded flex items-center gap-1"><Lock size={10} /> Locked</span>}
              </h3>
              {isDayStartOpen && <button type="button" onClick={() => addTask('yesterdayWork')} className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"><PlusCircle size={16} /> Add Task</button>}
            </div>

            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-2">Yesterday's Work</p>
            {formData.yesterdayWork.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 relative pr-12 animate-in slide-in-from-left-4 duration-300">
                <AutoResizeTextarea disabled={!isDayStartOpen} placeholder="What did you finish?" value={item.task} onPaste={(e) => handleTaskPaste('yesterdayWork', idx, e)} onChange={(e) => handleTaskChange('yesterdayWork', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} required />
                <select disabled={!isDayStartOpen} value={item.project} onChange={(e) => handleTaskChange('yesterdayWork', idx, 'project', e.target.value)} className={`w-32 ${inputBase}`} required>
                  <option value="" disabled>Select project</option>
                  {allProjectOptions.map((projectName) => <option key={projectName} value={projectName}>{projectName}</option>)}
                </select>
                {item.project === 'Others' && (
                  <input
                    disabled={!isDayStartOpen}
                    type="text"
                    value={item.customProject}
                    onChange={(e) => handleTaskChange('yesterdayWork', idx, 'customProject', e.target.value)}
                    placeholder="Specify project"
                    className={`w-40 ${inputBase}`}
                    required
                  />
                )}
                {(item.jiraId || item.task.toUpperCase().includes('JIRA')) && (
                  <input
                    type="text"
                    disabled={!isDayStartOpen}
                    placeholder="JIRA ID (e.g., ABC-123)"
                    value={item.jiraId || ''}
                    onChange={(e) => handleTaskChange('yesterdayWork', idx, 'jiraId', e.target.value.toUpperCase())}
                    className={`w-28 text-xs placeholder:text-slate-400 text-center text-slate-700 dark:text-slate-200 ${inputBase}`}
                    title="Automatically detected from task text or enter manually"
                  />
                )}
                <TimeInput hours={item.hours} minutes={item.minutes} onHoursChange={(e) => handleTaskChange('yesterdayWork', idx, 'hours', e.target.value)} onMinutesChange={(e) => handleTaskChange('yesterdayWork', idx, 'minutes', e.target.value)} disabled={!isDayStartOpen} />
                <select disabled={!isDayStartOpen} value={item.priority || 'Medium'} onChange={(e) => handleTaskChange('yesterdayWork', idx, 'priority', e.target.value)} className={`w-24 ${inputBase}`}>
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                </select>
                {isDayStartOpen && <button type="button" onClick={() => removeTask('yesterdayWork', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><X size={18} /></button>}
              </div>
            ))}

            <div className="flex justify-between items-center mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Today's Plan</p>
              {isDayStartOpen && <button type="button" onClick={() => addTask('todayPlan')} className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"><PlusCircle size={16} /> Add Plan Item</button>}
            </div>
            {formData.todayPlan.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 relative pr-12 animate-in slide-in-from-left-4 duration-300">
                <AutoResizeTextarea disabled={!isDayStartOpen} placeholder="Planned task..." value={item.task} onPaste={(e) => handleTaskPaste('todayPlan', idx, e)} onChange={(e) => handleTaskChange('todayPlan', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} required />
                <select disabled={!isDayStartOpen} value={item.project} onChange={(e) => handleTaskChange('todayPlan', idx, 'project', e.target.value)} className={`w-32 ${inputBase}`} required>
                  <option value="" disabled>Select project</option>
                  {allProjectOptions.map((projectName) => <option key={projectName} value={projectName}>{projectName}</option>)}
                </select>
                {item.project === 'Others' && (
                  <input
                    disabled={!isDayStartOpen}
                    type="text"
                    value={item.customProject}
                    onChange={(e) => handleTaskChange('todayPlan', idx, 'customProject', e.target.value)}
                    placeholder="Specify project"
                    className={`w-40 ${inputBase}`}
                    required
                  />
                )}
                {(item.jiraId || item.task.toUpperCase().includes('JIRA')) && (
                  <input
                    type="text"
                    disabled={!isDayStartOpen}
                    placeholder="JIRA ID (e.g., ABC-123)"
                    value={item.jiraId || ''}
                    onChange={(e) => handleTaskChange('todayPlan', idx, 'jiraId', e.target.value.toUpperCase())}
                    className={`w-28 text-xs placeholder:text-slate-400 text-center text-slate-700 dark:text-slate-200 ${inputBase}`}
                    title="Automatically detected from task text or enter manually"
                  />
                )}
                <TimeInput hours={item.hours} minutes={item.minutes} onHoursChange={(e) => handleTaskChange('todayPlan', idx, 'hours', e.target.value)} onMinutesChange={(e) => handleTaskChange('todayPlan', idx, 'minutes', e.target.value)} disabled={!isDayStartOpen} />
                <select disabled={!isDayStartOpen} value={item.priority || 'Medium'} onChange={(e) => handleTaskChange('todayPlan', idx, 'priority', e.target.value)} className={`w-24 ${inputBase}`}>
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                </select>
                {isDayStartOpen && <button type="button" onClick={() => removeTask('todayPlan', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><X size={18} /></button>}
              </div>
            ))}
          </div>

          {isUpdateMode && (
            <div className={`space-y-4 rounded-2xl p-6 border-2 shadow-md transition-all duration-300 hover:scale-[1.01] card-elevation ${!isDayEndOpen ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-70' : 'bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-900/10 dark:to-slate-900/20 border-green-200 dark:border-green-800/40'}`}>
              <div className="flex items-center justify-between border-b border-slate-300 dark:border-slate-600 pb-2">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-400 flex items-center gap-2">
                  2. Day End Actuals
                  {!isDayEndOpen && <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-0.5 rounded flex items-center gap-1"><Lock size={10} /> Closed (Opens at 5 PM)</span>}
                </h3>
                {isDayEndOpen && <button type="button" onClick={() => addTask('todayActuals')} className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"><PlusCircle size={16} /> Add Actual Item</button>}
              </div>

              {formData.todayActuals.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-green-200 dark:border-green-800/50 relative pr-12 shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300 dark:hover:border-green-600 animate-in slide-in-from-left-4 duration-300">
                  <AutoResizeTextarea disabled={!isDayEndOpen} placeholder="Actual task done" value={item.task} onPaste={(e) => handleTaskPaste('todayActuals', idx, e)} onChange={(e) => handleTaskChange('todayActuals', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} />
                  <select disabled={!isDayEndOpen} value={item.project} onChange={(e) => handleTaskChange('todayActuals', idx, 'project', e.target.value)} className={`w-32 ${inputBase}`}>
                    <option value="" disabled>Select project</option>
                    {allProjectOptions.map((projectName) => <option key={projectName} value={projectName}>{projectName}</option>)}
                  </select>
                  {item.project === 'Others' && (
                    <input
                      disabled={!isDayEndOpen}
                      type="text"
                      value={item.customProject}
                      onChange={(e) => handleTaskChange('todayActuals', idx, 'customProject', e.target.value)}
                      placeholder="Specify project"
                      className={`w-40 ${inputBase}`}
                      required
                    />
                  )}
                  {(item.jiraId || item.task.toUpperCase().includes('JIRA')) && (
                    <input
                      type="text"
                      disabled={!isDayEndOpen}
                      placeholder="JIRA ID (e.g., ABC-123)"
                      value={item.jiraId || ''}
                      onChange={(e) => handleTaskChange('todayActuals', idx, 'jiraId', e.target.value.toUpperCase())}
                      className={`w-28 text-xs placeholder:text-slate-400 text-center text-slate-700 dark:text-slate-200 ${inputBase}`}
                      title="Automatically detected from task text or enter manually"
                    />
                  )}
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
                  {isDayEndOpen && <button type="button" onClick={() => removeTask('todayActuals', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><X size={18} /></button>}

                  {item.isBlocked && (
                    <input disabled={!isDayEndOpen} type="text" placeholder="Explain the blocker..." value={item.blockerReason} onChange={(e) => handleTaskChange('todayActuals', idx, 'blockerReason', e.target.value)} className={`w-full mt-1 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 ${inputBase}`} required />
                  )}
                </div>
              ))}
            </div>
          )}

          {isKarthika && (
            <div className={`space-y-4 rounded-2xl p-6 border-2 shadow-md transition-all duration-300 hover:scale-[1.01] card-elevation bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/40`}>
              <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800/60 pb-2">
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-400 flex items-center gap-2">
                  3. Next Day's Status
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300 cursor-pointer">
                    <input type="checkbox" checked={showNextDay} onChange={e => setShowNextDay(e.target.checked)} className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 bg-white dark:bg-slate-800 w-4 h-4" />
                    Would you like to add next day's status?
                  </label>
                  {showNextDay && <button type="button" onClick={() => addTask('nextDayPlan')} className="inline-flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95"><PlusCircle size={16} /> Add Plan Item</button>}
                </div>
              </div>

              {showNextDay && formData.nextDayPlan.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded border border-purple-200 dark:border-purple-700 relative pr-12 transition-all animate-in slide-in-from-left-4 duration-300">
                  <AutoResizeTextarea placeholder="Next day's planned task..." value={item.task} onPaste={(e) => handleTaskPaste('nextDayPlan', idx, e)} onChange={(e) => handleTaskChange('nextDayPlan', idx, 'task', e.target.value)} className={`flex-1 min-w-[200px] ${inputBase}`} required />
                  <select value={item.project} onChange={(e) => handleTaskChange('nextDayPlan', idx, 'project', e.target.value)} className={`w-32 ${inputBase}`} required>
                    <option value="" disabled>Select project</option>
                    {allProjectOptions.map((projectName) => <option key={projectName} value={projectName}>{projectName}</option>)}
                  </select>
                  {item.project === 'Others' && (
                    <input type="text" value={item.customProject} onChange={(e) => handleTaskChange('nextDayPlan', idx, 'customProject', e.target.value)} placeholder="Specify project" className={`w-40 ${inputBase}`} required />
                  )}
                  {(item.jiraId || item.task.toUpperCase().includes('JIRA')) && (
                    <input type="text" placeholder="JIRA ID" value={item.jiraId || ''} onChange={(e) => handleTaskChange('nextDayPlan', idx, 'jiraId', e.target.value.toUpperCase())} className={`w-28 text-xs placeholder:text-slate-400 text-center text-slate-700 dark:text-slate-200 ${inputBase}`} title="JIRA ID" />
                  )}
                  <TimeInput hours={item.hours} minutes={item.minutes} onHoursChange={(e) => handleTaskChange('nextDayPlan', idx, 'hours', e.target.value)} onMinutesChange={(e) => handleTaskChange('nextDayPlan', idx, 'minutes', e.target.value)} disabled={false} />
                  <select value={item.priority || 'Medium'} onChange={(e) => handleTaskChange('nextDayPlan', idx, 'priority', e.target.value)} className={`w-24 ${inputBase}`}>
                    <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                  </select>
                  <button type="button" onClick={() => removeTask('nextDayPlan', idx)} className="absolute right-2 top-2.5 text-red-400 hover:text-red-600 p-1.5"><X size={18} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
            <button
              type="submit"
              disabled={submitting || (!isDayStartOpen && !isDayEndOpen)}
              className={`px-8 py-3 rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ripple-button ${submitting || (!isDayStartOpen && !isDayEndOpen) ? 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 dark:from-indigo-500 dark:to-indigo-600'}`}
            >
              {submitting ? '⏳ Saving...' : '✓ Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- VIEW 2: Scrum Dashboard ---
function DashboardView({
  data,
  loggedInUser,
  assignedSM,
  users,
  canManage,
  setStatusData,
  recordAudit,
  showConfirm,
  showNotification,
  teamsReminderConfig,
  setTeamsReminderConfig,
  reminderTriggers,
  markReminderTriggered
}) {
  const isManagerView = canManage;
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [generatedContent, setGeneratedContent] = useState(null);
  const [teamsWebhookUrl, setTeamsWebhookUrl] = useState('https://default414ad49ffdc94181bd7eba81a9cdb7.7f.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3af37b0ffc76482586cb2c84319d8242/triggers/manual/paths/invoke?api-version=1');
  const [emailConfig, setEmailConfig] = useState({
    address: 'admin@company.com',
    to: 'smscrum@dhyan.com'
  });

  const dailyData = useMemo(() => {
    return data
      .filter(d => d.date === selectedDate)
      .sort((a, b) => (a.userName || '').localeCompare(b.userName || ''));
  }, [data, selectedDate]);

  const missingUsers = useMemo(() => {
    const submittedIds = dailyData.map(d => d.userId);
    return users.filter(u => {
      const submission = dailyData.find(d => d.userId === u.id);
      const isLeave = submission?.status === 'LEAVE';
      return !submittedIds.includes(u.id) && !isLeave && u.role !== 'ADMIN';
    });
  }, [dailyData]);

  const toggleApproval = async (docId, currentStatus) => {
    const confirmed = await showConfirm(`Are you sure you want to ${currentStatus ? 'Unapprove' : 'Approve'} this status?`, currentStatus ? 'Unapprove Status' : 'Approve Status');
    if (!confirmed) return;

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
      recordAudit({
        userName: loggedInUser.name,
        action: updatedRecord.approved ? 'Approved Status' : 'Unapproved Status',
        targetDate: updatedRecord.date,
        details: `${updatedRecord.userName} status ${updatedRecord.approved ? 'approved' : 'unapproved'} by ${loggedInUser.name}`
      });
    } catch (err) {
      showNotification('error', "Failed to update approval status.");
    }
  };

  const markAsLeave = async (user) => {
    const confirmed = await showConfirm(`Mark ${user.name} as ON LEAVE for ${formatDate(selectedDate)}?`, 'Mark On Leave');
    if (!confirmed) return;

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
      recordAudit({
        userName: loggedInUser.name,
        action: 'Marked as Leave',
        targetDate: payload.date,
        details: `${loggedInUser.name} marked ${user.name} as on leave.`
      });
    } catch (err) {
      showNotification('error', "Failed to mark as leave.");
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showNotification('success', 'Copied!')).catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      showNotification('success', 'Copied!');
    } catch {
      showNotification('error', 'Failed to copy');
    }
    document.body.removeChild(textarea);
  };

  const copyHtmlToClipboard = (elementId) => {
    const node = document.getElementById(elementId);
    if (!node) return showNotification('error', 'Content not found');
    const range = document.createRange();
    range.selectNode(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      document.execCommand('copy');
      showNotification('success', 'HTML copied!');
    } catch {
      showNotification('error', 'Failed to copy HTML content');
    }
    selection.removeAllRanges();
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
    if (!loggedInUser) return;
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = `${getTodayString()}-${hhmm}`;
      const triggered = reminderTriggers[todayKey];

      if ((hhmm === '11:30' || hhmm === '18:30') && !triggered && missingUsers.length > 0) {
        markReminderTriggered(todayKey);
        copyToClipboard(generateReminderText());
        const recipients = teamsReminderConfig.recipients
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        if (recipients.length > 0) {
          const subject = encodeURIComponent(`Scrum Reminder - ${formatDate(selectedDate)}`);
          const body = encodeURIComponent(`⏰ Scrum Reminder (${hhmm})\n\n${generateReminderText()}`);
          const mailtoUrl = `mailto:${encodeURIComponent(recipients.join(','))}?subject=${subject}&body=${body}`;
          window.open(mailtoUrl, '_blank');
          showNotification('success', `Reminder email draft opened for ${recipients.length} recipient(s).`);
        } else {
          showNotification('info', `Reminder schedule (${hhmm}) triggered for ${missingUsers.length} pending update(s). Configure recipient mail IDs to draft emails.`);
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loggedInUser, missingUsers, teamsReminderConfig, selectedDate, reminderTriggers, markReminderTriggered]);

  const sendTeamsWebhook = async (type) => {
    if (!teamsWebhookUrl.trim()) {
      showNotification('error', 'Add Teams incoming webhook URL first.');
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
      showNotification('success', 'Posted to Microsoft Teams successfully.');
    } catch (error) {
      showNotification('error', `Failed to post to Teams webhook: ${error.message}`);
    }
  };

  const downloadPythonScript = () => {
    const reportDate = selectedDate || getTodayString();
    const reportDateLabel = formatDate(reportDate);
    const htmlTable = buildOutlookEmailHtml(reportDate, assignedSM, dailyData);

    const scriptContent = `#!/usr/bin/env python3
"""
StreetMan Scrum Automation - Outlook Email Sender

This script sends HTML emails via Microsoft Outlook Desktop application.
It includes comprehensive prerequisite checks to ensure the system is properly configured.

Generated on: ${new Date().toISOString()}
Report Date: ${reportDateLabel}
"""

import sys
import platform
import subprocess
import os


def check_python_version():
    """Check if Python version is 3.6 or higher."""
    if sys.version_info < (3, 6):
        print(f"❌ ERROR: Python {sys.version_info.major}.{sys.version_info.minor} is not supported.")
        print("   Required: Python 3.6 or higher")
        print(f"   Current: Python {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True


def check_operating_system():
    """Check if running on Windows (required for Outlook integration)."""
    if platform.system() != 'Windows':
        print(f"❌ ERROR: This script requires Windows OS for Outlook integration.")
        print(f"   Current OS: {platform.system()}")
        return False
    print(f"✅ Operating System: {platform.system()} {platform.release()}")
    return True


def check_outlook_installation():
    """Check if Microsoft Outlook is installed."""
    try:
        # Try to find Outlook executable
        outlook_paths = [
            r"C:\\Program Files\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE",
            r"C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\OUTLOOK.EXE",
            r"C:\\Program Files\\Microsoft Office\\Office16\\OUTLOOK.EXE",
            r"C:\\Program Files (x86)\\Microsoft Office\\Office16\\OUTLOOK.EXE",
            r"C:\\Program Files\\Microsoft Office\\Office15\\OUTLOOK.EXE",
            r"C:\\Program Files (x86)\\Microsoft Office\\Office15\\OUTLOOK.EXE",
        ]

        outlook_found = False
        for path in outlook_paths:
            if os.path.exists(path):
                print(f"✅ Microsoft Outlook found at: {path}")
                outlook_found = True
                break

        if not outlook_found:
            # Try to check via registry or other methods
            try:
                result = subprocess.run(['reg', 'query', r'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\OUTLOOK.EXE'],
                                      capture_output=True, text=True, check=False)
                if result.returncode == 0:
                    print("✅ Microsoft Outlook found in registry")
                    outlook_found = True
            except:
                pass

        if not outlook_found:
            print("❌ ERROR: Microsoft Outlook is not installed or not found in standard locations.")
            print("   Please install Microsoft Office with Outlook.")
            return False

        return True

    except Exception as e:
        print(f"❌ ERROR: Failed to check Outlook installation: {e}")
        return False


def check_pywin32():
    """Check if pywin32 is installed and install if missing."""
    try:
        import win32com.client
        print("✅ pywin32 module found")
        return True
    except ImportError:
        print("❌ pywin32 module is not installed.")
        print("📦 Installing pywin32...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "pywin32"])
            print("✅ pywin32 installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ ERROR: Failed to install pywin32: {e}")
            print("   Try manual installation: pip install pywin32")
            return False


def check_outlook_running():
    """Check if Outlook is running (optional but recommended)."""
    try:
        import win32com.client
        outlook = win32com.client.Dispatch('Outlook.Application')
        # Try to access a property to see if Outlook responds
        version = outlook.Version
        print(f"✅ Outlook is running (Version: {version})")
        return True
    except Exception as e:
        print("⚠️  WARNING: Outlook may not be running or accessible.")
        print("   It's recommended to have Outlook open for better reliability.")
        print("   Error details:", str(e))
        return True  # Don't fail the check, just warn


def run_prerequisite_checks():
    """Run all prerequisite checks."""
    print("🔍 Checking prerequisites for StreetMan Scrum Outlook Email Sender...")
    print("=" * 70)

    checks = [
        check_python_version,
        check_operating_system,
        check_pywin32,
        check_outlook_installation,
        check_outlook_running,
    ]

    all_passed = True
    for check in checks:
        if not check():
            all_passed = False
        print()

    if not all_passed:
        print("❌ Some prerequisites are not met. Please fix the issues above and try again.")
        sys.exit(1)

    print("✅ All prerequisites passed! Ready to send emails via Outlook.")
    print("=" * 70)
    return True


def send_outlook_email(to_emails, subject, html_content):
    """Send email via Outlook."""
    try:
        import win32com.client

        print("🔄 Connecting to Outlook...")
        outlook = win32com.client.Dispatch('Outlook.Application')
        mail = outlook.CreateItem(0)  # 0 = olMailItem

        mail.To = to_emails
        mail.Subject = subject
        mail.HTMLBody = html_content

        # mail.Display()  # Uncomment if you want to preview before sending
        mail.Send()

        print(f"✅ Email sent successfully to {to_emails} via Outlook Desktop!")
        return True

    except Exception as e:
        print(f"❌ Error sending email: {e}")
        print("👉 Note: Ensure Microsoft Outlook is installed and running.")
        print("👉 Try running: pip install pywin32")
        return False


def main():
    """Main function."""
    # Run prerequisite checks first
    run_prerequisite_checks()

    # --- CONFIG ---
    TO_EMAILS = "${emailConfig.to}"
    SUBJECT = "StreetMan Scrum Status - ${reportDateLabel}"

    # --- CONTENT ---
    html_content = """${htmlTable}"""

    # Send email
    if send_outlook_email(TO_EMAILS, SUBJECT, html_content):
        print("\\n🎉 StreetMan Scrum Status email sent successfully!")
        print(f"📅 Report Date: ${reportDateLabel}")
        print(f"📧 Recipients: ${emailConfig.to}")
    else:
        print("\\n❌ Failed to send StreetMan Scrum Status email.")
        sys.exit(1)


if __name__ == '__main__':
    main()
`;

    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `send_status_${reportDate}_${Date.now()}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadOutlookScript = async () => {
    downloadPythonScript();
  };

  const generateTeamsText = (type) => {
    const header = type === 'start'
      ? `Daily work plan ${formatDate(selectedDate)}:`
      : `Daily work summary ${formatDate(selectedDate)}:`;

    let content = `**${header}**\n\n`;

    dailyData.forEach(userEntry => {
      if (userEntry.status === 'LEAVE') return;

      let tasks = type === 'start' ? (userEntry.todayPlan || []) : (userEntry.todayActuals?.length > 0 ? userEntry.todayActuals : []);
      if (tasks.length === 0) {
        content += `- ${userEntry.userName}: No tasks recorded\n\n`;
      } else {
        content += `- ${userEntry.userName}:\n`;
        tasks.forEach((t) => {
          const duration = t.actualTime || t.time || '';
          content += `  - ${t.task}${t.project ? ` (${t.project})` : ''}${duration ? ` – ${duration}` : ''}${t.blockerReason ? ` (Blocker: ${t.blockerReason})` : ''}${type === 'end' && t.status ? ` (${t.status})` : ''}\n`;
        });
        content += '\n';
      }
    });
    return content;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="text-indigo-600" /> Scrum Dashboard
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Action Center for Scrum Master <strong>{assignedSM?.name || 'Assigned User'}</strong>.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily Status Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-900/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wide flex items-center gap-1.5"><Users size={14} /> Daily Submissions</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{dailyData.filter(d => d.status !== 'LEAVE').length}/{users.filter(u => u.role !== 'ADMIN').length}</div>
              <div className="text-right">
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  {((dailyData.filter(d => d.status !== 'LEAVE').length / users.filter(u => u.role !== 'ADMIN').length) * 100).toFixed(0)}% today
                </p>
                <p className="text-xs text-blue-500 dark:text-blue-400">{dailyData.filter(d => d.status === 'LEAVE').length} on leave</p>
              </div>
            </div>
          </div>

          {/* Approval Status */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-900/10 p-5 rounded-2xl border border-green-200 dark:border-green-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs text-green-700 dark:text-green-300 font-semibold uppercase tracking-wide flex items-center gap-1.5"><ShieldCheck size={14} /> Approved Today</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">{dailyData.filter(d => d.approved && d.status !== 'LEAVE').length}</div>
              <div className="text-right">
                <p className="text-xs text-green-600 dark:text-green-300">Approved</p>
                <p className="text-xs text-green-500 dark:text-green-400">{dailyData.filter(d => !d.approved && d.status !== 'LEAVE').length} pending</p>
              </div>
            </div>
          </div>

          {/* Tasks Submitted */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-900/10 p-5 rounded-2xl border border-orange-200 dark:border-orange-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs text-orange-700 dark:text-orange-300 font-semibold uppercase tracking-wide flex items-center gap-1.5"><CheckCircle2 size={14} /> Tasks Captured</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                {dailyData.reduce((sum, d) => sum + ((d.todayActuals || []).length || 0), 0)}
              </div>
              <div className="text-right">
                <p className="text-xs text-orange-600 dark:text-orange-300">Total actual tasks</p>
                <p className="text-xs text-orange-500 dark:text-orange-400">Day end entries</p>
              </div>
            </div>
          </div>

          {/* Blockers */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-900/10 p-5 rounded-2xl border border-red-200 dark:border-red-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs text-red-700 dark:text-red-300 font-semibold uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle size={14} /> Active Blockers</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                {dailyData.reduce((sum, d) => sum + ((d.todayActuals || []).filter(t => t.status === 'Blocked').length || 0), 0)}
              </div>
              <div className="text-right">
                <p className="text-xs text-red-600 dark:text-red-300">Blocked tasks</p>
                <p className="text-xs text-red-500 dark:text-red-400">Today</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isManagerView && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Weekly submission rate</p>
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{weeklyTrend.submittedPct.toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Avg planned vs actual</p>
            <p className="text-sm mt-2 text-slate-700 dark:text-slate-300">
              Planned: <strong>{weeklyTrend.avgPlannedHours.toFixed(2)}h</strong> | Actual: <strong>{weeklyTrend.avgActualHours.toFixed(2)}h</strong>
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
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
                              <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">Yesterday</p>
                              <ul className="list-none pl-0 space-y-2">
                                {(row.yesterdayWork || []).map((t, i) => (
                                  <li key={i} className="bg-slate-50 dark:bg-slate-700/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600/50 flex flex-col gap-1.5 hover:shadow-md transition-shadow">
                                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm leading-snug">{t.task}</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">{t.project || '-'}</span>
                                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> {t.time}</span>
                                      {t.priority && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.priority === 'High' || t.priority === 'Critical' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'}`}>{t.priority}</span>}
                                    </div>
                                    {t.blockerReason && <div className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 p-2 rounded"><AlertTriangle size={14} className="shrink-0" /> <span className="leading-tight">{t.blockerReason}</span></div>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-[11px] uppercase font-bold text-slate-400 dark:text-slate-500 mt-3 mb-1.5">Today's Plan</p>
                              <ul className="list-none pl-0 space-y-2">
                                {(row.todayPlan || []).map((t, i) => (
                                  <li key={i} className="bg-slate-50 dark:bg-slate-700/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600/50 flex flex-col gap-1.5 hover:shadow-md transition-shadow">
                                    <span className="font-medium text-slate-700 dark:text-slate-200 text-sm leading-snug">{t.task}</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">{t.project || '-'}</span>
                                      <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> {t.time}</span>
                                      {t.priority && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.priority === 'High' || t.priority === 'Critical' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300'}`}>{t.priority}</span>}
                                    </div>
                                    {t.blockerReason && <div className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 p-2 rounded"><AlertTriangle size={14} className="shrink-0" /> <span className="leading-tight">{t.blockerReason}</span></div>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 w-full min-h-[100px]">
                            <Clock size={20} className="mb-1 opacity-50" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Pending Update</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {isLeave ? '-' : row ? (
                          <ul className="list-none pl-0 space-y-2">
                            {(row.todayActuals || []).length === 0 && <li className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">No day-end actuals captured</li>}
                            {(row.todayActuals || []).map((t, i) => (
                              <li key={i} className="bg-slate-50 dark:bg-slate-700/30 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600/50 flex flex-col gap-1.5 hover:shadow-md transition-shadow">
                                <span className="font-medium text-slate-700 dark:text-slate-200 text-sm leading-snug">{t.task}</span>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5 rounded-full">{t.project || '-'}</span>
                                  <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock size={10} /> {t.actualTime || t.time || '-'}</span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${t.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : t.status === 'Blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                                    {t.status === 'Completed' ? <CheckCircle2 size={10} /> : t.status === 'Blocked' ? <AlertTriangle size={10} /> : <RefreshCw size={10} />}
                                    {t.status || 'Completed'}
                                  </span>
                                </div>
                                {t.blockerReason && <div className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5 bg-red-50 dark:bg-red-900/20 p-2 rounded"><AlertTriangle size={14} className="shrink-0" /> <span className="leading-tight">{t.blockerReason}</span></div>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 w-full min-h-[100px]">
                            <Clock size={20} className="mb-1 opacity-50" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Pending Update</span>
                          </div>
                        )}
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
              <button onClick={() => setGeneratedContent(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white"><X size={20} /></button>
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
                      <Download size={18} className="text-green-600 dark:text-green-400" /> Download Python Script (Outlook)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Download a Python script that sends the report using local Outlook Desktop when executed.</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input type="text" placeholder="Your Email" className={inputBase} value={emailConfig.address} onChange={e => setEmailConfig({ ...emailConfig, address: e.target.value })} />
                      <input type="text" placeholder="Recipient Emails (comma separated)" className={`col-span-2 ${inputBase}`} value={emailConfig.to} onChange={e => setEmailConfig({ ...emailConfig, to: e.target.value })} />
                    </div>
                    <div className="space-y-3">
                      <button onClick={downloadOutlookScript} className="w-full py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 text-sm">Download .py Script</button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-6 rounded shadow">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200">Email Preview</h4>
                      <button onClick={() => copyHtmlToClipboard('email-template')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">📋 Copy HTML</button>
                    </div>
                    <div id="email-template" className="border dark:border-slate-600 overflow-auto max-h-96 text-slate-800 dark:text-slate-200" style={{ backgroundColor: '#f8fafc' }}>
                      <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif", lineHeight: '1.6', color: '#333' }}>
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', padding: '30px 20px', textAlign: 'center', borderRadius: '8px 8px 0 0' }}>
                          <h1 style={{ margin: 0, color: 'white', fontSize: '28px', fontWeight: 700 }}>StreetMan Scrum Status</h1>
                          <p style={{ margin: '8px 0 0 0', color: '#e0e7ff', fontSize: '14px' }}>Daily Standup Report</p>
                        </div>

                        {/* Date & Info */}
                        <div style={{ backgroundColor: '#f0f4ff', padding: '16px 20px', borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: 0, color: '#666', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Report Date</p>
                            <p style={{ margin: '4px 0 0 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 700 }}>{formatDate(selectedDate)}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0, color: '#666', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scrum Master</p>
                            <p style={{ margin: '4px 0 0 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 700 }}>{assignedSM?.name || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px 20px', background: 'white' }}>
                          <p style={{ margin: '0 0 20px 0', color: '#555', fontSize: '15px' }}>Hi Team,</p>
                          <p style={{ margin: '0 0 24px 0', color: '#555', fontSize: '15px' }}>Please find the scrum status summary below.</p>

                          {/* Data Table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <thead>
                              <tr style={{ background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)', color: 'white' }}>
                                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '14px', borderBottom: '3px solid #1e3a8a', letterSpacing: '0.5px' }}>Team Member</th>
                                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '14px', borderBottom: '3px solid #1e3a8a', letterSpacing: '0.5px' }}>Yesterday's Work</th>
                                <th style={{ padding: '14px 12px', textAlign: 'left', fontWeight: 700, fontSize: '14px', borderBottom: '3px solid #1e3a8a', letterSpacing: '0.5px' }}>Today's Plan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dailyData.map((row, idx) => {
                                const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafb';
                                const borderColor = idx === dailyData.length - 1 ? '2px solid #e5e7eb' : '1px solid #e5e7eb';
                                if (row.status === 'LEAVE') {
                                  return (
                                    <tr key={idx} style={{ backgroundColor: bg }}>
                                      <td style={{ padding: '14px 12px', borderBottom: borderColor, fontWeight: 600, color: '#1e3a8a' }}>{row.userName}</td>
                                      <td style={{ padding: '14px 12px', borderBottom: borderColor, textAlign: 'center', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', color: '#92400e', fontWeight: 600 }} colSpan="2">🏖️ ON LEAVE</td>
                                    </tr>
                                  );
                                }
                                const yesterday = (row.yesterdayWork || []).filter(t => t.task?.trim()).length > 0
                                  ? (row.yesterdayWork || []).filter(t => t.task?.trim()).map((t, i) => <li key={i} style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>{t.task}</li>)
                                  : <li style={{ margin: '4px 0', color: '#999', fontSize: '14px', fontStyle: 'italic' }}>No tasks</li>;
                                const today = (row.todayPlan || []).filter(t => t.task?.trim()).length > 0
                                  ? (row.todayPlan || []).filter(t => t.task?.trim()).map((t, i) => <li key={i} style={{ margin: '4px 0', color: '#333', fontSize: '14px' }}>{t.task}</li>)
                                  : <li style={{ margin: '4px 0', color: '#999', fontSize: '14px', fontStyle: 'italic' }}>No tasks</li>;
                                return (
                                  <tr key={idx} style={{ backgroundColor: bg }}>
                                    <td style={{ padding: '14px 12px', borderBottom: borderColor, fontWeight: 600, color: '#1e3a8a' }}>{row.userName}</td>
                                    <td style={{ padding: '14px 12px', borderBottom: borderColor }}><ul style={{ margin: 0, paddingLeft: '20px' }}>{yesterday}</ul></td>
                                    <td style={{ padding: '14px 12px', borderBottom: borderColor }}><ul style={{ margin: 0, paddingLeft: '20px' }}>{today}</ul></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary */}
                        <div style={{ padding: '16px 20px', backgroundColor: '#f0f4ff', borderTop: '1px solid #e5e7eb' }}>
                          <p style={{ margin: 0, color: '#1e3a8a', fontSize: '13px', fontWeight: 600 }}>
                            ✅ Total Members: <strong>{dailyData.length}</strong> | 🏖️ On Leave: <strong>{dailyData.filter(d => d.status === 'LEAVE').length}</strong>
                          </p>
                        </div>

                        {/* Footer */}
                        <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', padding: '24px 20px', textAlign: 'center', borderRadius: '0 0 8px 8px', color: 'white' }}>
                          <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>{assignedSM?.name || 'StreetMan Scrum Automation'}</p>
                          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#d1d5db' }}>Automated daily standup reporting system</p>
                          <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', borderTop: '1px solid #374151', paddingTop: '12px' }}>
                            Generated on {new Date().toLocaleString()}
                          </p>
                        </div>
                      </div>
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
function ReportsView({ data, showNotification, users }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isExporting, setIsExporting] = useState(false);

  const downloadChartAsPNG = (containerId, filename, titleText, legendData, legendColors) => {
    const container = document.getElementById(containerId);
    if (!container) return showNotification('error', 'Chart not found.');
    const svg = container.querySelector('svg');
    if (!svg) return showNotification('error', 'SVG not found.');

    let svgData = new XMLSerializer().serializeToString(svg);
    // Ensure the SVG namespace is present (required for image rendering)
    if (!svgData.includes('xmlns="http://www.w3.org/2000/svg"')) {
      svgData = svgData.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgSize = svg.getBoundingClientRect();
    const titleHeight = titleText ? 40 : 0;
    
    let legendHeight = 0;
    if (legendData && legendData.length > 0) {
      // Dynamically calculate required lines for the legend
      const tempCanvas = document.createElement('canvas');
      const tctx = tempCanvas.getContext('2d');
      tctx.font = '12px sans-serif';
      let cx = 20;
      let lines = 1;
      legendData.forEach(item => {
        const text = `${item.name} (${item.value}h)`;
        const tw = tctx.measureText(text).width;
        cx += tw + 30;
        if (cx > svgSize.width - 80) {
          cx = 20;
          lines++;
        }
      });
      legendHeight = lines * 20 + 20;
    }

    const canvas = document.createElement('canvas');
    canvas.width = svgSize.width * 2; // Scale by 2 for high DPI displays
    canvas.height = (svgSize.height + titleHeight + legendHeight) * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    
    const isDark = document.documentElement.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, svgSize.width, svgSize.height + titleHeight + legendHeight);
    
    if (titleText) {
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, svgSize.width / 2, 25);
    }
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, titleHeight);
      
      if (legendData && legendData.length > 0) {
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        const startY = titleHeight + svgSize.height + 20;
        let currentX = 20;
        let currentY = startY;
        
        legendData.forEach((item, index) => {
          const color = legendColors ? legendColors[index % legendColors.length] : '#3b82f6';
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(currentX + 5, currentY - 4, 5, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
          const text = `${item.name} (${item.value}h)`;
          ctx.fillText(text, currentX + 15, currentY);
          
          const textWidth = ctx.measureText(text).width;
          currentX += textWidth + 30;
          
          if (currentX > svgSize.width - 80) {
            currentX = 20;
            currentY += 20;
          }
        });
      }
      
      const a = document.createElement('a');
      a.download = filename;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
  };

  const styleHeader = (cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = fullBorder();
  };

  const styleSubHeader = (cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = fullBorder();
  };

  const fullBorder = () => ({
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  });

  const filteredData = useMemo(() => {
    return data
      .filter(d => d.date.startsWith(month))
      .filter((doc) => {
        if (doc.status === 'LEAVE') return true;
        return (doc.todayActuals || []).some(t => (t.task || '').trim());
      });
  }, [data, month]);

  const summaryStats = useMemo(() => {
    const members = [...new Set(filteredData.map(d => d.userName))];
    const totalEntries = filteredData.length;
    const leaveEntries = filteredData.filter(d => d.status === 'LEAVE').length;
    const workingEntries = filteredData.filter(d => d.status !== 'LEAVE').length;
    return { members: members.length, totalEntries, workingEntries, leaveEntries };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const teamMembers = users ? users.filter(u => u.role !== 'ADMIN').map(u => u.name) : [...new Set(filteredData.map(d => d.userName))];
    return teamMembers.map(memberName => {
      const memberData = filteredData.filter(d => d.userName === memberName && d.status !== 'LEAVE');
      let totalHours = 0;
      memberData.forEach(doc => {
        const tasks = doc.todayActuals || [];
        tasks.forEach(t => {
          totalHours += durationToHours(t.actualTime || t.time);
        });
      });
      return {
        name: memberName,
        hours: Number(totalHours.toFixed(2))
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [filteredData]);

  const projectChartData = useMemo(() => {
    const projectMap = {};
    filteredData.forEach(doc => {
      (doc.todayActuals || []).forEach(t => {
        if (t.task?.trim()) {
          const p = t.project || 'Unassigned';
          projectMap[p] = (projectMap[p] || 0) + durationToHours(t.actualTime || t.time);
        }
      });
    });
    return Object.entries(projectMap)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

  const downloadExcel = async () => {
    if (!filteredData.length) {
      showNotification('error', "No valid data found for selected month.");
      return;
    }

    setIsExporting(true);
    try {
      await generateExcelReport(filteredData, month);
      showNotification('success', "Excel report downloaded successfully!");
    } catch (error) {
      console.error('Export error:', error);
      showNotification('error', "Failed to generate Excel report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const generateExcelReport = async (data, month) => {
    const workbook = new window.ExcelJS.Workbook();
    const members = [...new Set(data.map(d => d.userName))];

    // Create Summary Sheet
    createSummarySheet(workbook, members, data);

    // Create Project Allocation Sheet
    createProjectSummarySheet(workbook, projectChartData);

    // Create Member Detail Sheets
    members.forEach(memberName => {
      createMemberSheet(workbook, memberName, data.filter(d => d.userName === memberName), month);
    });

    // Download the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StreetMan_Report_${month}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createSummarySheet = (workbook, members, data) => {
    const summarySheet = workbook.addWorksheet("Summary");

    summarySheet.columns = [
      { header: "Employee", key: "name", width: 25, hidden: false },
      { header: "Working Days", key: "workingDays", width: 15, hidden: false },
      { header: "Leave Days", key: "leaveDays", width: 12, hidden: false },
      { header: "Weekend Days", key: "weekendDays", width: 15, hidden: false },
      { header: "Total Hours", key: "totalHours", width: 15, hidden: false },
      { header: "Avg Hours/Day", key: "avgHours", width: 18, hidden: false }
    ];

    const headerRow = summarySheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    headerRow.alignment = { horizontal: 'center' };

    members.forEach(memberName => {
      const memberRows = data.filter(d => d.userName === memberName);

      let workingDays = 0;
      let leaveDays = 0;
      let weekendDays = 0;
      let totalHours = 0;

      memberRows.forEach(doc => {
        const date = new Date(doc.date);
        const isWeekend = [0, 6].includes(date.getDay());

        if (isWeekend) {
          weekendDays++;
          return;
        }
        if (doc.status === 'LEAVE') {
          leaveDays++;
          return;
        }

        workingDays++;

        const tasks = [
          ...(doc.yesterdayWork || []),
          ...(doc.todayActuals || [])
        ];

        tasks.forEach(t => {
          totalHours += durationToHours(t.actualTime || t.time);
        });
      });

      const avgHours = workingDays ? totalHours / workingDays : 0;

      summarySheet.addRow({
        name: memberName,
        workingDays,
        leaveDays,
        weekendDays,
        totalHours: Number(totalHours.toFixed(2)),
        avgHours: Number(avgHours.toFixed(2))
      });
    });

    // TOTAL ROW
    const lastRow = summarySheet.rowCount + 1;
    summarySheet.addRow({
      name: "TOTAL",
      workingDays: { formula: `SUM(B2:B${lastRow - 1})` },
      leaveDays: { formula: `SUM(C2:C${lastRow - 1})` },
      weekendDays: { formula: `SUM(D2:D${lastRow - 1})` },
      totalHours: { formula: `SUM(E2:E${lastRow - 1})` },
      avgHours: { formula: `AVERAGE(F2:F${lastRow - 1})` }
    });

    summarySheet.getRow(summarySheet.rowCount).font = { bold: true };
    summarySheet.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const createProjectSummarySheet = (workbook, projectData) => {
    const sheet = workbook.addWorksheet("Project Summary");

    sheet.columns = [
      { header: "Project", key: "name", width: 25 },
      { header: "Total Hours", key: "hours", width: 15 },
      { header: "Allocation (%)", key: "percentage", width: 15 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    const totalHours = projectData.reduce((sum, p) => sum + p.value, 0);

    projectData.forEach(p => {
      const percentage = totalHours ? (p.value / totalHours) * 100 : 0;
      const row = sheet.addRow({
        name: p.name,
        hours: p.value,
        percentage: Number(percentage.toFixed(2))
      });
      row.getCell('percentage').numFmt = '0.00"%"';
    });

    // Add Total Row
    const totalRow = sheet.addRow({
      name: "TOTAL",
      hours: Number(totalHours.toFixed(2)),
      percentage: 100
    });
    totalRow.font = { bold: true };
    totalRow.getCell('percentage').numFmt = '0.00"%"';

    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  };

  const createMemberSheet = (workbook, memberName, memberData, month) => {
    const sheet = workbook.addWorksheet(memberName.slice(0, 31));

    const sortedData = memberData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const projects = Array.from(new Set(
      sortedData.flatMap(d =>
        [...(d.yesterdayWork || []), ...(d.todayActuals || [])]
          .filter(t => t.task?.trim())
          .map(t => t.project || 'Unassigned')
      )
    )).sort();

    // ===================== COLUMNS =====================
    const columns = [{ header: 'Date', key: 'date', width: 14 }];
    projects.forEach(p => {
      columns.push({ header: `${p} Task`, width: 35 });
      columns.push({ header: `${p} Duration`, width: 14 });
    });

    sheet.columns = columns;

    // ===================== TITLE (ROW 1) =====================
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${memberName} - ${month}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };

    // Merge full row for title
    sheet.mergeCells(1, 1, 1, sheet.columnCount);

    // ===================== HEADER ROW 2 =====================
    const header1 = sheet.getRow(2);

    sheet.mergeCells('A2:A3');
    const dateCell = header1.getCell(1);
    dateCell.value = 'Date';
    styleHeader(dateCell);

    let col = 2;
    projects.forEach(p => {
      sheet.mergeCells(2, col, 2, col + 1);

      const c = header1.getCell(col);
      c.value = p;
      styleHeader(c);

      col += 2;
    });

    // ===================== HEADER ROW 3 =====================
    const header2 = sheet.getRow(3);

    col = 2;
    projects.forEach(() => {
      ['Task', 'Duration'].forEach((h, i) => {
        const c = header2.getCell(col + i);
        c.value = h;
        styleSubHeader(c);
      });
      col += 2;
    });

    // ===================== DATA =====================
    sortedData.forEach(doc => {
      const date = new Date(doc.date);
      const isWeekend = [0, 6].includes(date.getDay());

      const row = sheet.addRow({});
      row.getCell(1).value = date;
      row.getCell(1).numFmt = 'dd-mmm-yy';

      // 🔴 HOLIDAY ROW
      if (isWeekend) {
        const lastCol = sheet.columnCount;

        sheet.mergeCells(row.number, 1, row.number, lastCol);

        const c = row.getCell(1);
        c.value = 'HOLIDAY';
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF00' } };
        c.font = { bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };

        // BORDER
        c.border = fullBorder();

        return;
      }

      const grouped = {};
      (doc.todayActuals || [])
        .forEach(t => {
          if (!t.task?.trim()) return;
          const p = t.project || 'Unassigned';
          if (!grouped[p]) grouped[p] = [];
          grouped[p].push({
            task: t.task,
            hrs: durationToHours(t.actualTime || t.time)
          });
        });

      projects.forEach((p, i) => {
        const base = 2 + i * 2;
        const tasks = grouped[p] || [];

        const text = tasks.map(t => `• ${t.task}`).join('\n');
        const total = tasks.reduce((s, t) => s + t.hrs, 0);

        const taskCell = row.getCell(base);
        const durCell = row.getCell(base + 1);

        taskCell.value = text || '-';
        taskCell.alignment = { wrapText: true };

        durCell.value = Number(total.toFixed(2));
        durCell.numFmt = '0.00';

        // Borders
        taskCell.border = fullBorder();
        durCell.border = fullBorder();
      });

      row.getCell(1).border = fullBorder();
    });

    sheet.views = [{ state: 'frozen', ySplit: 3 }];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Monthly Reports</h2>
          <p className="text-slate-500 dark:text-slate-400">Export detailed Excel reports for selected month</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Month:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`${inputBase} w-auto`}
            />
          </div>
          <button
            onClick={downloadExcel}
            disabled={isExporting || !filteredData.length}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${isExporting || !filteredData.length
              ? 'bg-slate-400 cursor-not-allowed text-slate-200'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
              }`}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Exporting...
              </>
            ) : (
              <>
                <FileSpreadsheet size={20} />
                Export Excel Report
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-900/10 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center">
            <Users size={24} className="text-indigo-600 dark:text-indigo-400 mb-2" />
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{summaryStats.members}</div>
            <div className="text-sm font-medium text-indigo-600/80 dark:text-indigo-400/80 uppercase tracking-wider mt-1 text-center">Team Members</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-900/10 p-5 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center">
            <FileSpreadsheet size={24} className="text-blue-600 dark:text-blue-400 mb-2" />
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{summaryStats.totalEntries}</div>
            <div className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider mt-1 text-center">Total Entries</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-900/10 p-5 rounded-2xl border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center">
            <CalendarCheck size={24} className="text-green-600 dark:text-green-400 mb-2" />
            <div className="text-3xl font-bold text-green-700 dark:text-green-300">{summaryStats.workingEntries}</div>
            <div className="text-sm font-medium text-green-600/80 dark:text-green-400/80 uppercase tracking-wider mt-1 text-center">Working Days</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-900/10 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center">
            <Coffee size={24} className="text-amber-600 dark:text-amber-400 mb-2" />
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{summaryStats.leaveEntries}</div>
            <div className="text-sm font-medium text-amber-600/80 dark:text-amber-400/80 uppercase tracking-wider mt-1 text-center">Leave Days</div>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Hours by Team Member</h3>
                <button onClick={() => downloadChartAsPNG('bar-chart-container', `Hours_by_Member_${month}.png`, 'Hours by Team Member')} className="text-xs flex items-center gap-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors font-semibold shadow-sm active:scale-95 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <ImageIcon size={14} /> Export Image
                </button>
              </div>
              <div id="bar-chart-container" className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                      <XAxis dataKey="name" tick={{ angle: -45, textAnchor: 'end', fontSize: 11 }} interval={0} height={100} />
                      <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft', fontSize: 12, offset: -5 }} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${value} hours`, 'Duration']} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="hours" fill="#3b82f6" name="Total Hours" barSize={32} radius={[4, 4, 0, 0]} minPointSize={3} animationDuration={1500} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Time Allocation by Project</h3>
                <button onClick={() => downloadChartAsPNG('pie-chart-container', `Time_by_Project_${month}.png`, 'Time Allocation by Project', projectChartData, COLORS)} className="text-xs flex items-center gap-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors font-semibold shadow-sm active:scale-95 dark:bg-purple-900/50 dark:text-purple-300">
                  <ImageIcon size={14} /> Export Image
                </button>
              </div>
              <div id="pie-chart-container" className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex justify-center items-center">
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectChartData} cx="50%" cy="50%"
                        innerRadius={80} outerRadius={120}
                        paddingAngle={3} dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={true}
                        animationDuration={1500}
                      >
                        {projectChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ outline: 'none' }} className="hover:opacity-80 transition-opacity duration-300 cursor-pointer" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} hours`, 'Total Time']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {!filteredData.length && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p>No data available for the selected month.</p>
            <p className="text-sm">Try selecting a different month or ensure data has been entered.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- VIEW 4: Audit Logs ---
function AuditLogsView({ data, showNotification }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  const sortedLogs = [...data].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const filteredLogs = sortedLogs.filter(log => {
    const matchesSearch = !searchTerm ||
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesUser = selectedUser === 'all' || log.userName === selectedUser;

    return matchesSearch && matchesAction && matchesUser;
  });

  const uniqueActions = [...new Set(data.map(log => log.action).filter(Boolean))];
  const uniqueUsers = [...new Set(data.map(log => log.userName).filter(Boolean))];

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedFilteredLogs = [...filteredLogs].sort((a, b) => {
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    if (sortConfig.key === 'timestamp' || sortConfig.key === 'targetDate') {
      aVal = new Date(aVal).getTime() || 0;
      bVal = new Date(bVal).getTime() || 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }
  });

  const exportAuditLogs = async (format = 'xlsx') => {
    if (!filteredLogs.length) {
      showNotification('warning', 'No log entries to export.');
      return;
    }

    if (format === 'csv') {
      const header = ['Timestamp (IST)', 'User', 'Action', 'Target Date', 'Details'];
      const rows = filteredLogs.map((log) => [
        getISTString(log.timestamp),
        log.userName || '',
        log.action || '',
        formatDate(log.targetDate || getTodayString()),
        log.details || ''
      ]);
      const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'Audit logs exported as CSV!');
      return;
    }

    if (!window.ExcelJS) {
      showNotification('warning', 'Excel export library is loading. Please wait and try again.');
      return;
    }

    const workbook = new window.ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Logs');

    sheet.columns = [
      { header: 'Timestamp (IST)', key: 'timestamp', width: 24 },
      { header: 'User', key: 'user', width: 18 },
      { header: 'Action', key: 'action', width: 25 },
      { header: 'Target Date', key: 'targetDate', width: 15 },
      { header: 'Details', key: 'details', width: 40 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    sheet.getRow(1).alignment = { horizontal: 'center' };

    filteredLogs.forEach((log, index) => {
      const row = sheet.addRow({
        timestamp: getISTString(log.timestamp),
        user: log.userName || '',
        action: log.action || '',
        targetDate: formatDate(log.targetDate || getTodayString()),
        details: log.details || ''
      });

      // Alternate row colors
      if (index % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', 'Audit logs exported as Excel!');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Logs</h2>
          <p className="text-slate-500 dark:text-slate-400">View and export system activity logs</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input
              type="text"
              placeholder="Search logs by user, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputBase} w-full pl-10`}
            />
          </div>
          <div className="sm:w-56 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className={`${inputBase} w-full pl-10 appearance-none`}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <div className="sm:w-56 relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className={`${inputBase} w-full pl-10 appearance-none`}
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => exportAuditLogs('csv')}
              disabled={!filteredLogs.length}
              className={`px-4 py-2 rounded font-medium transition ${filteredLogs.length
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-400 cursor-not-allowed text-slate-200'
                }`}
            >
              Export CSV
            </button>
            <button
              onClick={() => exportAuditLogs('xlsx')}
              disabled={!filteredLogs.length}
              className={`px-4 py-2 rounded font-medium transition ${filteredLogs.length
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-slate-400 cursor-not-allowed text-slate-200'
                }`}
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg text-slate-600 dark:text-slate-300"><History size={20} /></div>
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">{data.length}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Logs</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg text-blue-600 dark:text-blue-400"><Search size={20} /></div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredLogs.length}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filtered</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg text-green-600 dark:text-green-400"><Users size={20} /></div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{uniqueUsers.length}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Users</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg text-purple-600 dark:text-purple-400"><Activity size={20} /></div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{uniqueActions.length}</div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action Types</div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative border border-slate-200 dark:border-slate-700 rounded-lg">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20 shadow-sm bg-slate-100 dark:bg-slate-700">
              <tr>
                <th onClick={() => handleSort('timestamp')} className="sticky top-0 left-0 z-30 bg-slate-100 dark:bg-slate-700 px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-r border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-1.5"><Clock size={14} /> Timestamp {sortConfig.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('userName')} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-700 px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <div className="flex items-center gap-1.5"><User size={14} /> User {sortConfig.key === 'userName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('action')} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-700 px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <div className="flex items-center gap-1.5"><Activity size={14} /> Action {sortConfig.key === 'action' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('targetDate')} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-700 px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> Target Date {sortConfig.key === 'targetDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</div>
                </th>
                <th onClick={() => handleSort('details')} className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-700 px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <div className="flex items-center gap-1.5"><Tag size={14} /> Details {sortConfig.key === 'details' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFilteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    {data.length === 0 ? 'No audit logs available.' : 'No logs match the current filters.'}
                  </td>
                </tr>
              ) : (
                sortedFilteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 animate-in fade-in duration-500">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {getISTString(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-white">
                      {log.userName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border ${log.action?.includes('Created') || log.action?.includes('Submitted') || log.action?.includes('Added')
                        ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50'
                        : log.action?.includes('Updated') || log.action?.includes('Assigned') || log.action?.includes('Changed')
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50'
                          : log.action?.includes('Deleted') || log.action?.includes('Removed') || log.action?.includes('Unapproved')
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'
                            : log.action?.includes('Logged In')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50'
                              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}>
                        {log.action?.includes('Created') || log.action?.includes('Added') || log.action?.includes('Submitted') ? <PlusCircle size={12} /> :
                          log.action?.includes('Deleted') || log.action?.includes('Removed') ? <Trash2 size={12} /> :
                            log.action?.includes('Updated') || log.action?.includes('Changed') ? <Edit3 size={12} /> :
                              log.action?.includes('Logged') ? <Activity size={12} /> :
                                log.action?.includes('Assigned') ? <UserCog size={12} /> :
                                  <Tag size={12} />}
                        {log.action || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {formatDate(log.targetDate || getTodayString())}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- VIEW 5: Admin Panel ---
function AdminView({ users, setUsers, projectsState, setProjects, teamsState, setTeams, appConfigState, setAppConfig, currentUserProfile, recordAudit, showNotification, showConfirm, handleChangePin }) {
  const [newMember, setNewMember] = useState({ id: '', name: '', team: teamsState[0] || 'Default', pin: '' });
  const [newTeam, setNewTeam] = useState('');
  const [newProject, setNewProject] = useState('');

  const handleAssign = async (userId) => {
    const confirmed = await showConfirm("Confirm: Assign this user as the new Weekly Scrum Master?", 'Assign Scrum Master');
    if (!confirmed) return;
    setAppConfig(prev => ({ ...prev, currentScrumMasterId: userId }));
    const assignedUser = users.find(u => u.id === userId);
    recordAudit({
      userName: currentUserProfile.name,
      action: 'Assigned Weekly Scrum Master',
      targetDate: getTodayString(),
      details: `Assigned ${assignedUser?.name || userId} as the new Weekly Scrum Master.`
    });
    showNotification('success', "Scrum Master Updated Successfully!");
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
      showNotification('error', 'Please enter member id, name and PIN.');
      return;
    }
    if (users.some((u) => u.id === payload.id)) {
      showNotification('error', 'Member ID already exists. Use a unique ID.');
      return;
    }
    if (users.some((u) => u.pin === payload.pin)) {
      showNotification('error', 'PIN already used. Use a unique PIN for each member.');
      return;
    }

    setUsers((prev) => [...prev, payload]);
    setNewMember({ id: '', name: '', team: MEMBER_TEAMS[0], pin: '' });
    recordAudit({
      userName: currentUserProfile.name,
      action: 'Added New Member',
      targetDate: getTodayString(),
      details: `Added new member ${payload.name} (ID: ${payload.id}, Team: ${payload.team}).`
    });
    showNotification('success', 'New member added successfully.');
  };

  const handleAddTeam = () => {
    if (!newTeam.trim()) return;
    if (teamsState.includes(newTeam.trim())) {
      showNotification('error', 'Team already exists.');
      return;
    }
    setTeams(prev => [...prev, newTeam.trim()]);
    setNewTeam('');
    recordAudit({ userName: currentUserProfile.name, action: 'Added Team', details: `Added team ${newTeam.trim()}` });
    showNotification('success', 'Team added.');
  };

  const handleRemoveTeam = async (team) => {
    if (await showConfirm(`Remove team ${team}?`)) {
      setTeams(prev => prev.filter(t => t !== team));
      recordAudit({ userName: currentUserProfile.name, action: 'Removed Team', details: `Removed team ${team}` });
    }
  };

  const handleAddProject = () => {
    if (!newProject.trim()) return;
    if (projectsState.includes(newProject.trim())) {
      showNotification('error', 'Project already exists.');
      return;
    }
    setProjects(prev => [...prev, newProject.trim()]);
    setNewProject('');
    recordAudit({ userName: currentUserProfile.name, action: 'Added Project', details: `Added project ${newProject.trim()}` });
    showNotification('success', 'Project added.');
  };

  const handleRemoveProject = async (project) => {
    if (await showConfirm(`Remove project ${project}?`)) {
      setProjects(prev => prev.filter(p => p !== project));
      recordAudit({ userName: currentUserProfile.name, action: 'Removed Project', details: `Removed project ${project}` });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserCog /> Admin Control Panel
        </h2>
        <p className="text-indigo-200 mt-2 text-sm">Manage weekly roles and rotation.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Add New Member</h3>
        <div className="grid md:grid-cols-12 gap-3 mb-5">
          <input
            type="text"
            placeholder="Member ID"
            className={`md:col-span-3 ${inputBase}`}
            value={newMember.id}
            onChange={(e) => setNewMember((prev) => ({ ...prev, id: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Member name"
            className={`md:col-span-3 ${inputBase}`}
            value={newMember.name}
            onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className={`md:col-span-3 ${inputBase}`}
            value={newMember.team}
            onChange={(e) => setNewMember((prev) => ({ ...prev, team: e.target.value }))}
          >
            {teamsState.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
          </select>
          <input
            type="password"
            placeholder="Unique PIN"
            className={`md:col-span-3 ${inputBase}`}
            value={newMember.pin}
            onChange={(e) => setNewMember((prev) => ({ ...prev, pin: e.target.value }))}
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAddMember}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center gap-2"
          >
            <PlusCircle size={16} /> Add Member
          </button>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 mt-6">Assign Weekly Scrum Master</h3>
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
              <div className="flex items-center gap-2">
                {appConfigState.currentScrumMasterId === user.id ? (
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
                <button
                  onClick={() => handleChangePin(user)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded transition"
                >
                  Change PIN
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 p-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Users size={18} /> Manage Teams</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New Team Name" className={`flex-1 ${inputBase}`} value={newTeam} onChange={e => setNewTeam(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTeam()} />
            <button onClick={handleAddTeam} className="bg-indigo-600 text-white px-3 rounded hover:bg-indigo-700"><PlusCircle size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamsState.map(team => (
              <span key={team} className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                {team} <button onClick={() => handleRemoveTeam(team)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Layers size={18} /> Manage Projects</h3>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="New Project Name" className={`flex-1 ${inputBase}`} value={newProject} onChange={e => setNewProject(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddProject()} />
            <button onClick={handleAddProject} className="bg-purple-600 text-white px-3 rounded hover:bg-purple-700"><PlusCircle size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {projectsState.map(project => (
              <span key={project} className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
                {project} <button onClick={() => handleRemoveProject(project)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- VIEW 6: Kanban Board ---
function KanbanView({ data, users }) {
  const [filterDate, setFilterDate] = useState(getTodayString());

  const dayData = useMemo(() => data.filter(d => d.date === filterDate && d.status !== 'LEAVE'), [data, filterDate]);

  const columns = useMemo(() => {
    const cols = {
      'To Do (Plan)': [],
      'In Progress': [],
      'Blocked': [],
      'Completed': []
    };

    dayData.forEach(userDoc => {
      (userDoc.todayPlan || []).forEach(task => {
        if (task.task?.trim()) cols['To Do (Plan)'].push({ ...task, userName: userDoc.userName, userId: userDoc.userId });
      });
      (userDoc.todayActuals || []).forEach(task => {
        if (!task.task?.trim()) return;
        if (task.status === 'Blocked') cols['Blocked'].push({ ...task, userName: userDoc.userName, userId: userDoc.userId });
        else if (task.status === 'In Progress') cols['In Progress'].push({ ...task, userName: userDoc.userName, userId: userDoc.userId });
        else cols['Completed'].push({ ...task, userName: userDoc.userName, userId: userDoc.userId });
      });
    });
    return cols;
  }, [dayData]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <KanbanSquare className="text-indigo-600" /> Kanban Board
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visualize daily task flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Date:</span>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={inputBase} />
        </div>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-4 items-start flex-1 min-h-[500px]">
        {Object.entries(columns).map(([colName, tasks], colIndex) => (
          <div key={colName} className="flex-1 min-w-[300px] w-80 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
              <h3 className="font-bold text-slate-700 dark:text-slate-200">{colName}</h3>
              <span className="bg-white dark:bg-slate-700 text-xs font-bold px-2 py-1 rounded shadow-sm">{tasks.length}</span>
            </div>
            <div className="overflow-y-auto pr-2 space-y-3 flex-1 hide-scrollbar">
              {tasks.length === 0 && <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">No tasks</p>}
              {tasks.map((task, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow animate-in slide-in-from-bottom-2 duration-300 fill-mode-both" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">{task.project || 'General'}</span>
                    {task.priority && <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${task.priority === 'High' || task.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{task.priority}</span>}
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mb-3">{task.task}</p>
                  {task.blockerReason && <div className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded mb-3 flex gap-1.5"><AlertTriangle size={14} className="shrink-0" /> {task.blockerReason}</div>}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><User size={12} /> {task.userName}</div>
                    {task.time && <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium"><Clock size={12} /> {task.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- VIEW 7: Personal Analytics ---
function AnalyticsView({ data, currentUserProfile }) {
  const userStats = useMemo(() => {
    const userEntries = data.filter(d => d.userId === currentUserProfile.id).sort((a, b) => new Date(a.date) - new Date(b.date));

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const trendData = last7Days.map(date => {
      const entry = userEntries.find(e => e.date === date);
      let hrs = 0;
      if (entry && entry.status !== 'LEAVE') {
        (entry.todayActuals || []).forEach(t => hrs += durationToHours(t.actualTime || t.time));
      }
      return { name: formatDate(date).slice(0, 6), date, Hours: Number(hrs.toFixed(1)) };
    });

    let totalHoursMonth = 0;
    const currentMonth = getTodayString().slice(0, 7);
    userEntries.filter(e => e.date.startsWith(currentMonth)).forEach(e => {
      if (e.status !== 'LEAVE') (e.todayActuals || []).forEach(t => totalHoursMonth += durationToHours(t.actualTime || t.time));
    });

    return { trendData, totalHoursMonth: totalHoursMonth.toFixed(1), entriesCount: userEntries.length };
  }, [data, currentUserProfile]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {currentUserProfile.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{currentUserProfile.name}</h2>
            <p className="text-slate-500 dark:text-slate-400">{currentUserProfile.team} • {currentUserProfile.role}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl text-center border border-blue-100 dark:border-blue-800/50">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{userStats.totalHoursMonth}h</p>
            <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mt-1">This Month</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl text-center border border-green-100 dark:border-green-800/50">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{userStats.entriesCount}</p>
            <p className="text-xs font-bold text-green-800 dark:text-green-300 uppercase mt-1">Total Submissions</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Last 7 Days Burn-down</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userStats.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="Hours" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// --- VIEW 8: Timeline View ---
function TimelineView({ data }) {
  const timelineData = useMemo(() => {
    const grouped = data.reduce((acc, entry) => {
      if (!acc[entry.date]) acc[entry.date] = [];
      acc[entry.date].push(entry);
      return acc;
    }, {});
    return Object.entries(grouped).sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 14); // Last 14 active days
  }, [data]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center justify-center gap-3">
          <GitCommit className="text-indigo-500" size={32} /> Historical Timeline
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Chronological feed of team updates over the last 14 days.</p>
      </div>

      <div className="relative border-l-2 border-indigo-200 dark:border-indigo-800/50 ml-4 md:ml-8 space-y-10">
        {timelineData.map(([date, entries], index) => (
          <div key={date} className="relative pl-8 md:pl-12 animate-in slide-in-from-bottom-8 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="absolute -left-[9px] top-1 w-4 h-4 bg-indigo-500 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm"></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 bg-white dark:bg-slate-800 inline-block px-4 py-1.5 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
              {formatDate(date)}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {entries.map(entry => (
                <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                        {entry.userName.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{entry.userName}</span>
                    </div>
                    {entry.status === 'LEAVE' ? (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">LEAVE</span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">{entry.todayActuals?.length || 0} tasks</span>
                    )}
                  </div>
                  {entry.status !== 'LEAVE' && (
                    <ul className="space-y-1.5">
                      {(entry.todayActuals || []).slice(0, 3).map((t, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-slate-400 truncate flex items-center gap-2">
                          <CheckCircle2 size={12} className={t.status === 'Completed' ? 'text-green-500' : 'text-slate-400'} /> {t.task}
                        </li>
                      ))}
                      {(entry.todayActuals?.length > 3) && (
                        <li className="text-xs text-indigo-500 font-medium italic mt-1">+ {entry.todayActuals.length - 3} more</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}