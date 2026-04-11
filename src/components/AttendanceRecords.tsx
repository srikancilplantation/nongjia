import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Worker, AttendanceRecord, OperationType, ActivityRecord, YieldRecord } from '../types';
import { handleFirestoreError } from '../utils';
import { Save, Calendar as CalendarIcon, UserCheck, Users, ChevronLeft, ChevronRight, CheckSquare, Square, Droplets, TrendingUp, Info } from 'lucide-react';
import { format, addDays, subDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'motion/react';
import { useCrops } from '../hooks/useCrops';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { Crop } from '../types';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const WORKER_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export default function AttendanceRecords({ 
  user, 
  selectedCrop, 
  crops 
}: { 
  user: User, 
  selectedCrop: string, 
  crops: Crop[] 
}) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [yields, setYields] = useState<YieldRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const workersQuery = query(
      collection(db, 'workers'),
      where('userId', '==', user.uid),
      where('active', '==', true)
    );

    const attendanceQuery = query(
      collection(db, 'attendanceRecords'),
      where('userId', '==', user.uid)
    );

    const activityQuery = query(
      collection(db, 'activityRecords'),
      where('userId', '==', user.uid)
    );

    const yieldQuery = query(
      collection(db, 'yieldRecords'),
      where('userId', '==', user.uid)
    );

    const unsubWorkers = onSnapshot(workersQuery, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'workers'));

    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendanceRecords'));

    const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activityRecords'));

    const unsubYield = onSnapshot(yieldQuery, (snapshot) => {
      setYields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YieldRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'yieldRecords'));

    return () => {
      unsubWorkers();
      unsubAttendance();
      unsubActivity();
      unsubYield();
    };
  }, [user]);

  const currentDayRecord = attendance.find(a => 
    isSameDay(parseISO(a.date), selectedDate as Date) && a.cropType === selectedCrop
  );

  const dayActivities = activities.filter(a => 
    isSameDay(parseISO(a.date), selectedDate as Date) && a.cropType === selectedCrop
  );

  const dayYields = yields.filter(y => 
    isSameDay(parseISO(y.date), selectedDate as Date) && y.cropType === selectedCrop
  );

  const getWorkerMonthlyStats = (workerId: string) => {
    const date = selectedDate as Date;
    const month = date.getMonth();
    const year = date.getFullYear();
    
    return attendance.filter(a => {
      const recordDate = parseISO(a.date);
      return a.cropType === selectedCrop &&
             recordDate.getMonth() === month &&
             recordDate.getFullYear() === year &&
             a.workerIds.includes(workerId);
    }).length;
  };

  const toggleWorker = async (workerId: string) => {
    try {
      const dateStr = startOfDay(selectedDate as Date).toISOString();
      let newWorkerIds = currentDayRecord ? [...currentDayRecord.workerIds] : [];

      if (newWorkerIds.includes(workerId)) {
        newWorkerIds = newWorkerIds.filter(id => id !== workerId);
      } else {
        newWorkerIds.push(workerId);
      }

      if (currentDayRecord) {
        await updateDoc(doc(db, 'attendanceRecords', currentDayRecord.id!), {
          workerIds: newWorkerIds
        });
      } else {
        const newDocRef = doc(collection(db, 'attendanceRecords'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          date: dateStr,
          workerIds: newWorkerIds,
          cropType: selectedCrop,
          userId: user.uid
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendanceRecords');
    }
  };

  const markAll = async () => {
    try {
      const dateStr = startOfDay(selectedDate as Date).toISOString();
      const allWorkerIds = workers.map(w => w.id!);

      if (currentDayRecord) {
        await updateDoc(doc(db, 'attendanceRecords', currentDayRecord.id!), {
          workerIds: allWorkerIds
        });
      } else {
        const newDocRef = doc(collection(db, 'attendanceRecords'));
        await setDoc(newDocRef, {
          id: newDocRef.id,
          date: dateStr,
          workerIds: allWorkerIds,
          cropType: selectedCrop,
          userId: user.uid
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendanceRecords');
    }
  };

  const clearAll = async () => {
    if (currentDayRecord) {
      try {
        await deleteDoc(doc(db, 'attendanceRecords', currentDayRecord.id!));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'attendanceRecords');
      }
    }
  };

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;
    
    const dayRecord = attendance.find(a => 
      isSameDay(parseISO(a.date), date) && a.cropType === selectedCrop
    );

    if (!dayRecord || dayRecord.workerIds.length === 0) return null;

    return (
      <div className="flex flex-wrap justify-center gap-0.5 mt-1 px-0.5 max-w-full overflow-hidden">
        {dayRecord.workerIds.map((workerId) => {
          const workerIndex = workers.findIndex(w => w.id === workerId);
          if (workerIndex === -1) return null;
          const color = WORKER_COLORS[workerIndex % WORKER_COLORS.length];
          return (
            <div 
              key={workerId} 
              className="w-1 h-1 rounded-full flex-shrink-0" 
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="animate-pulse h-96 bg-emerald-50/50 rounded-3xl border border-emerald-100" />;

  if (crops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Sprout className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-950 mb-2 font-serif">欢迎使用出勤管理</h2>
        <p className="text-emerald-700/60 mb-8 max-w-md">在记录出勤之前，请先添加您农场种植的作物种类。</p>
        <Link 
          to="/crops" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
        >
          前往添加农作物
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Calendar */}
        <div className="lg:col-span-5 bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100 h-fit">
          <div className="flex items-center justify-between mb-6 px-2">
            <h3 className="font-black text-emerald-950 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-emerald-500" />
              出勤日历
            </h3>
          </div>
          <Calendar
            onChange={(val) => setSelectedDate(val as Value)}
            value={selectedDate}
            tileContent={tileContent}
            className="w-full border-none rounded-xl shadow-none font-sans"
          />
          <div className="mt-6 space-y-2 px-2">
            <p className="text-[10px] font-bold text-emerald-600/40 uppercase tracking-widest">工人颜色标识</p>
            <div className="flex flex-wrap gap-2">
              {workers.map((worker, idx) => (
                <div key={worker.id} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: WORKER_COLORS[idx % WORKER_COLORS.length] }} 
                  />
                  <span className="text-[10px] font-medium text-emerald-900/60">{worker.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Attendance List for Selected Day */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-emerald-100">
            <div className="flex items-center justify-between mb-8">
              <button 
                onClick={() => setSelectedDate(subDays(selectedDate as Date, 1))}
                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-black text-emerald-950">
                  {format(selectedDate as Date, 'yyyy年MM月dd日')}
                </h2>
                <p className="text-[10px] font-bold text-emerald-600/50 mt-0.5 uppercase tracking-widest">出勤管理 ({selectedCrop})</p>
              </div>
              <button 
                onClick={() => setSelectedDate(addDays(selectedDate as Date, 1))}
                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              <button 
                onClick={markAll}
                className="flex-1 py-2.5 px-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-100"
              >
                全员出勤
              </button>
              <button 
                onClick={clearAll}
                className="flex-1 py-2.5 px-4 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-100"
              >
                重置清空
              </button>
            </div>

            <div className="space-y-2">
              {workers.map((worker, idx) => {
                const isPresent = currentDayRecord?.workerIds.includes(worker.id!);
                const workerColor = WORKER_COLORS[idx % WORKER_COLORS.length];
                const monthlyDays = getWorkerMonthlyStats(worker.id!);
                
                return (
                  <button
                    key={worker.id}
                    onClick={() => toggleWorker(worker.id!)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all group ${
                      isPresent 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                        : 'bg-white border-emerald-50 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm`}
                        style={{ 
                          backgroundColor: isPresent ? workerColor : '#f0fdf4',
                          color: isPresent ? 'white' : '#6ee7b7'
                        }}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 flex items-center justify-between mr-4">
                        <div className="text-left">
                          <span className={`font-bold block ${isPresent ? 'text-emerald-950' : 'text-slate-600'}`}>{worker.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: workerColor }} />
                            <span className="text-[10px] text-slate-400 font-medium">专属标识色</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-0.5">月度出勤</span>
                          <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black whitespace-nowrap shadow-sm border border-emerald-200/50">
                            {monthlyDays} 天
                          </span>
                        </div>
                      </div>
                    </div>
                    {isPresent ? (
                      <div 
                        className="w-6 h-6 rounded-lg flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: workerColor }}
                      >
                        <CheckSquare className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <Square className="w-6 h-6 text-emerald-100 group-hover:text-emerald-200 transition-colors" />
                    )}
                  </button>
                );
              })}
              {workers.length === 0 && (
                <div className="text-center py-12 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-100">
                  <Users className="w-10 h-10 text-emerald-100 mx-auto mb-3" />
                  <p className="text-emerald-300 text-sm font-medium">请先在“工人管理”中添加在职工人</p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-900/60">
                <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-xs font-bold">今日出勤: <span className="text-lg font-black text-emerald-600">{currentDayRecord?.workerIds.length || 0}</span> / {workers.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .react-calendar {
          width: 100% !important;
          background: transparent !important;
          border: none !important;
        }
        .react-calendar__navigation button {
          color: #064e3b;
          font-weight: 700;
          font-size: 1rem;
        }
        .react-calendar__month-view__weekdays__weekday {
          color: #065f46;
          font-size: 0.7rem;
          text-transform: uppercase;
          font-weight: 700;
          padding-bottom: 0.5rem;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        .react-calendar__tile {
          padding: 0.75rem 0.25rem !important;
          border-radius: 0.75rem;
          transition: all 0.2s;
          position: relative;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
          background-color: #ecfdf5 !important;
        }
        .react-calendar__tile--now {
          background: #f0fdf4 !important;
          color: #10b981 !important;
          font-weight: 700;
        }
        .react-calendar__tile--active {
          background: #10b981 !important;
          color: white !important;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
        }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
          background: #059669 !important;
        }
      `}} />
    </div>
  );
}
