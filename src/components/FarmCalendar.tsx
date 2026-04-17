import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityRecord, OperationType, AttendanceRecord, Worker } from '../types';
import { handleFirestoreError, triggerPrint } from '../utils';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay, parseISO } from 'date-fns';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Link,
  useLocation
} from 'react-router-dom';
import { 
  Droplets, 
  TrendingUp, 
  Info, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Save, 
  Calendar as CalendarIcon,
  MapPin,
  Beaker,
  ClipboardList,
  UserCheck,
  Users,
  Printer,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocations } from '../hooks/useLocations';
import { useActivityTypes } from '../hooks/useActivityTypes';
import { Crop } from '../types';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function FarmCalendar({ 
  user, 
  selectedCrop, 
  crops 
}: { 
  user: User, 
  selectedCrop: string, 
  crops: Crop[] 
}) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());
  const [loading, setLoading] = useState(true);
  const { locations, loading: locationsLoading } = useLocations(user);
  const { activityTypes, loading: typesLoading } = useActivityTypes(user);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'calendar' | 'report'>('calendar');
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  
  // Modal state for adding/editing activities
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ActivityRecord>>({
    date: format(new Date(), "yyyy-MM-dd"),
    type: '',
    cropType: '',
    location: '',
    materialUsed: '',
    quantity: 0,
    unit: 'kg',
    area: '',
    notes: '',
    status: 'Completed'
  });

  useEffect(() => {
    if (activityTypes.length > 0 && !formData.type && !editingId) {
      setFormData(prev => ({ ...prev, type: activityTypes[0].name }));
    }
  }, [activityTypes, formData.type, editingId]);

  useEffect(() => {
    if (!user) return;

    const activityQuery = query(
      collection(db, 'activityRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityRecord)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activityRecords'));

    return () => {
      unsubActivity();
    };
  }, [user]);

  const filteredActivities = activities.filter(a => 
    a.cropType === selectedCrop && 
    (selectedLocation === 'All' || a.location === selectedLocation)
  );

  const getActivityColor = (type: string) => {
    const activityType = activityTypes.find(t => t.name === type);
    if (activityType) return activityType.color;
    
    if (type.includes('施肥') || type.includes('Fertilization')) return '#10b981';
    if (type.includes('打草药') || type.includes('Herbicide')) return '#f59e0b';
    if (type.includes('打菌药') || type.includes('Fungicide')) return '#3b82f6';
    if (type.includes('打肥水') || type.includes('Fertilizer Water')) return '#14b8a6';
    if (type.includes('打菌水') || type.includes('Bactericide Water')) return '#06b6d4';
    if (type.includes('打微量元素') || type.includes('Trace Elements')) return '#6366f1';
    return '#64748b';
  };

  const getActivityBg = (type: string) => {
    const color = getActivityColor(type);
    return {
      backgroundColor: `${color}10`, // 10% opacity
      borderColor: `${color}30` // 30% opacity
    };
  };

  const getTypeText = (type: string) => {
    return type;
  };

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    const dayActivities = filteredActivities.filter(a => isSameDay(parseISO(a.date), date));

    if (dayActivities.length === 0) return null;

    return (
      <div className="flex flex-wrap justify-center gap-0.5 mt-1 max-w-[24px] mx-auto">
        {dayActivities.map((a, i) => (
          <div 
            key={`act-${i}`} 
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: getActivityColor(a.type) }}
            title={getTypeText(a.type)} 
          />
        ))}
      </div>
    );
  };

  const currentDayData = {
    activities: filteredActivities.filter(a => isSameDay(parseISO(a.date), selectedDate as Date))
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { id, ...rest } = formData;
      const data = { 
        ...rest, 
        quantity: isNaN(Number(rest.quantity)) ? 0 : Number(rest.quantity),
        userId: user.uid 
      };
      
      if (editingId) {
        await updateDoc(doc(db, 'activityRecords', editingId), {
          ...data,
          status: data.status || 'Completed'
        });
      } else {
        await addDoc(collection(db, 'activityRecords'), {
          ...data,
          status: data.status || 'Completed'
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || '保存失败，请重试');
      handleFirestoreError(error, OperationType.WRITE, 'activityRecords');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, 'activityRecords', itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activityRecords');
    }
  };

  const handleEdit = (record: ActivityRecord) => {
    setEditingId(record.id!);
    setFormData(record);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    const dateStr = format(selectedDate as Date, "yyyy-MM-dd");
    setEditingId(null);
    setFormData({
      date: dateStr,
      type: activityTypes.length > 0 ? activityTypes[0].name : '',
      cropType: selectedCrop || (crops.length > 0 ? crops[0].name : ''),
      location: locations.length > 0 ? locations[0].name : '',
      materialUsed: '',
      quantity: 0,
      unit: 'kg',
      area: '',
      notes: '',
      status: 'Completed'
    });
    setIsModalOpen(true);
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    triggerPrint();
    // Reset printing state after a delay
    setTimeout(() => setIsPrinting(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-4xl font-display font-black text-emerald-950 tracking-tight">农事日历与记录</h1>
          <p className="text-emerald-600/60 font-medium mt-1">管理您的农活记录与年月报告</p>
        </div>
        <div className="flex gap-3 items-start">
          <div className="flex flex-col items-end">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`p-2.5 bg-white text-emerald-600 rounded-2xl hover:bg-emerald-50 transition-all border border-emerald-100 shadow-sm flex items-center gap-2 ${isPrinting ? 'opacity-50' : ''}`}
              title="打印当前视图"
            >
              {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              {isPrinting && <span className="text-xs font-bold">准备打印...</span>}
            </button>
            {isPrinting && window.self !== window.top && (
              <p className="text-[10px] text-amber-600 font-bold mt-2 animate-pulse print:hidden max-w-[150px] text-right">
                提示：如果打印窗口未弹出，请点击右上角“在新窗口打开”后再试。
              </p>
            )}
          </div>
          <div className="bg-emerald-100/50 p-1 rounded-2xl flex border border-emerald-100">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-emerald-400 hover:text-emerald-600'
              }`}
            >
              日历视图
            </button>
            <button
              onClick={() => setViewMode('report')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                viewMode === 'report' 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-emerald-400 hover:text-emerald-600'
              }`}
            >
              年月报告
            </button>
          </div>
          <button
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 font-bold active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>新增农事</span>
          </button>
        </div>
      </div>

      {/* Location Filter */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide print:hidden">
        <div className="flex items-center gap-2 px-3 border-r border-slate-100 mr-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">地点筛选</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLocation('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedLocation === 'All'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            全部地点
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedLocation === loc.name
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Calendar */}
          <div className="lg:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              className="w-full border-none rounded-xl shadow-none font-sans"
            />
            
            <div className="mt-10 pt-8 border-t border-slate-50 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">图例说明</p>
              <div className="grid grid-cols-1 gap-3">
                {activityTypes.map((type) => (
                  <div key={type.id} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shadow-sm" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-600 transition-colors">{type.name}</span>
                    </div>
                    <div className={`h-1 w-0 group-hover:w-8 bg-emerald-100 rounded-full transition-all duration-300`} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xl text-slate-800 tracking-tight">
                      {format(selectedDate as Date, 'yyyy年MM月dd日')}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">当日记录清单</p>
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <span className="text-xs font-black text-slate-500 font-mono">COUNT: {currentDayData.activities.length}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {currentDayData.activities.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                      <Info className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="font-bold">当天没有任何农事记录</p>
                    <button 
                      onClick={openAddModal}
                      className="mt-4 bg-emerald-50 text-emerald-600 px-6 py-2 rounded-xl font-bold hover:bg-emerald-100 transition-all active:scale-95"
                    >
                      立即添加一条
                    </button>
                  </div>
                )}

                {/* Activities Section */}
                {currentDayData.activities.length > 0 && (
                  <div className="space-y-4">
                    {currentDayData.activities.map(a => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={a.id} 
                        className="p-5 border-2 rounded-2xl flex items-center justify-between gap-4 transition-all hover:shadow-md"
                        style={getActivityBg(a.type)}
                      >
                        <div className="flex items-center gap-5">
                          <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: getActivityColor(a.type) }}
                          >
                            <Droplets className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-display font-black text-lg text-slate-800">{getTypeText(a.type)}</p>
                              <span className="text-[10px] font-black px-2 py-1 bg-white/60 rounded-lg text-slate-500 uppercase tracking-wider">{a.cropType}</span>
                              {a.status === 'Pending' && (
                                <span className="text-[10px] px-2 py-1 bg-rose-500 text-white rounded-lg font-black uppercase tracking-wider animate-pulse">待完成</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm font-bold text-slate-600">{a.materialUsed}</p>
                              <div className="w-1 h-1 bg-slate-300 rounded-full" />
                              <p className="text-sm font-mono font-black text-emerald-600">{a.quantity}{a.unit}</p>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              {a.location && (
                                <span className="text-[10px] font-black text-emerald-600/60 flex items-center gap-1.5 uppercase tracking-widest">
                                  <MapPin className="w-3 h-3" />
                                  {a.location}
                                </span>
                              )}
                              {a.area && (
                                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                                  <ClipboardList className="w-3 h-3" />
                                  {a.area}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEdit(a)} className="p-3 bg-white/50 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-white transition-all shadow-sm">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(a.id!)} className="p-3 bg-white/50 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white transition-all shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report Filters */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-100 flex flex-wrap items-center justify-between gap-8 print:hidden">
            <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-2 bg-emerald-50 p-1.5 rounded-2xl border border-emerald-100">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
                    reportType === 'monthly' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  月报
                </button>
                <button
                  onClick={() => setReportType('yearly')}
                  className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
                    reportType === 'yearly' 
                      ? 'bg-white text-emerald-600 shadow-sm' 
                      : 'text-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  年报
                </button>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">年份</label>
                  <select 
                    value={reportYear}
                    onChange={(e) => setReportYear(parseInt(e.target.value))}
                    className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                      <option key={y} value={y}>{y}年</option>
                    ))}
                  </select>
                </div>

                {reportType === 'monthly' && (
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">月份</label>
                    <select 
                      value={reportMonth}
                      onChange={(e) => setReportMonth(parseInt(e.target.value))}
                      className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 text-sm font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-emerald-600/60 text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-50/50 px-5 py-3 rounded-2xl border border-emerald-100">
                <Info className="w-4 h-4" />
                <span>{selectedCrop} · {selectedLocation === 'All' ? '全部地点' : selectedLocation}</span>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className={`p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 cursor-pointer flex items-center gap-2 ${isPrinting ? 'opacity-50' : ''}`}
                title="打印报告"
              >
                {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                {isPrinting && <span className="text-xs font-bold">准备打印...</span>}
              </button>
            </div>
          </div>

          {/* Detailed Activity List */}
          <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-display font-black text-xl text-emerald-950 tracking-tight">详细记录清单</h4>
                  <p className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.2em] mt-0.5">
                    {reportYear}年{reportType === 'monthly' ? `${reportMonth}月` : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-emerald-50">
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">日期</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">类型</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">材料</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">用量</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">地点/区域</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {activities
                    .filter(a => {
                      const date = parseISO(a.date);
                      const cropMatch = a.cropType === selectedCrop;
                      const locationMatch = selectedLocation === 'All' ? true : a.location === selectedLocation;
                      const yearMatch = date.getFullYear() === reportYear;
                      const monthMatch = reportType === 'monthly' ? (date.getMonth() + 1 === reportMonth) : true;
                      return cropMatch && locationMatch && yearMatch && monthMatch;
                    })
                    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                    .map(a => (
                      <tr key={a.id} className="hover:bg-emerald-50/30 transition-all group">
                        <td className="px-8 py-6 text-xs font-black text-emerald-900/40 font-mono whitespace-nowrap">
                          {format(parseISO(a.date), 'yyyy-MM-dd')}
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold text-emerald-950">
                            {getTypeText(a.type)}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-sm font-black text-emerald-950 group-hover:text-emerald-600 transition-colors">{a.materialUsed}</td>
                        <td className="px-8 py-6 text-sm text-emerald-600 font-mono font-black">{a.quantity}{a.unit}</td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-emerald-900/70">{a.location}</span>
                            <span className="text-[10px] font-bold text-emerald-600/40 uppercase tracking-widest mt-0.5">{a.area}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-medium text-emerald-900/40 max-w-[240px] truncate italic">{a.notes}</td>
                      </tr>
                    ))}
                  {activities.filter(a => {
                    const date = parseISO(a.date);
                    const cropMatch = a.cropType === selectedCrop;
                    const locationMatch = selectedLocation === 'All' ? true : a.location === selectedLocation;
                    const yearMatch = date.getFullYear() === reportYear;
                    const monthMatch = reportType === 'monthly' ? (date.getMonth() + 1 === reportMonth) : true;
                    return cropMatch && locationMatch && yearMatch && monthMatch;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-24 text-center text-emerald-200 font-black uppercase tracking-[0.3em] italic">
                        该时间段没有任何记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Activities */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-800">{editingId ? '编辑活动' : '新增农事活动'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">日期</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">活动类型</label>
                    <select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    >
                      {activityTypes.map(type => (
                        <option key={type.id} value={type.name}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">针对作物</label>
                    <select
                      value={formData.cropType}
                      onChange={e => setFormData({ ...formData, cropType: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    >
                      {crops.map(crop => (
                        <option key={crop.id} value={crop.name}>{crop.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">地点</label>
                    <select
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    >
                      {locations.length === 0 ? (
                        <option value="">请先添加地点</option>
                      ) : (
                        locations.map(loc => (
                          <option key={loc.id} value={loc.name}>{loc.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">工作区域/详细位置 (可选)</label>
                  <input
                    type="text"
                    placeholder="例如: 靠近大路, 第3排"
                    value={formData.area}
                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">使用材料 (肥料/药名)</label>
                  <input
                    type="text"
                    required
                    placeholder="例如: 15-15-15, 草甘膦"
                    value={formData.materialUsed}
                    onChange={e => setFormData({ ...formData, materialUsed: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">用量</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={isNaN(formData.quantity as number) ? '' : formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: e.target.value === '' ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">单位</label>
                    <input
                      type="text"
                      placeholder="kg / L / 包"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">备注</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <input
                    type="checkbox"
                    id="status"
                    checked={formData.status === 'Completed'}
                    onChange={e => setFormData({ ...formData, status: e.target.checked ? 'Completed' : 'Pending' })}
                    className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="status" className="text-sm font-bold text-emerald-900">标记为已完成</label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {isSubmitting ? '正在提交...' : (editingId ? '保存修改' : '确认添加')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">确认删除？</h3>
              <p className="text-slate-500 mb-6">您确定要删除这条记录吗？此操作无法撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .react-calendar {
          width: 100% !important;
          background: transparent !important;
          border: none !important;
        }
        .react-calendar__navigation button {
          color: #1e293b;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .react-calendar__month-view__weekdays__weekday {
          color: #64748b;
          font-size: 0.75rem;
          text-transform: uppercase;
          font-weight: 600;
          padding-bottom: 1rem;
        }
        .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        .react-calendar__tile {
          padding: 1.25rem 0.5rem !important;
          border-radius: 0.75rem;
          transition: all 0.2s;
          position: relative;
        }
        .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus {
          background-color: #f1f5f9 !important;
        }
        .react-calendar__tile--now {
          background: #f8fafc !important;
          color: #10b981 !important;
          font-weight: 700;
        }
        .react-calendar__tile--active {
          background: #10b981 !important;
          color: white !important;
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
        }
        .react-calendar__tile--active:enabled:hover, .react-calendar__tile--active:enabled:focus {
          background: #059669 !important;
        }
      `}} />
    </div>
  );
}
