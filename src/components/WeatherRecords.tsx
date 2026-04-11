import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { WeatherRecord, OperationType } from '../types';
import { handleFirestoreError } from '../utils';
import { Plus, Trash2, Edit2, X, Save, Sun, CloudRain, Cloud, Zap, Calendar, Thermometer, Droplet, Printer } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import CalendarComponent from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function WeatherRecords({ user }: { user: User }) {
  const [records, setRecords] = useState<WeatherRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'report'>('calendar');
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState<Partial<WeatherRecord>>({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    condition: 'Sunny',
    temperature: 30,
    rainfall: 0,
    notes: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'weatherRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeatherRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'weatherRecords'));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      // Sanitize data: remove id and handle potential NaN values
      const { id, ...rest } = formData;
      const data = { 
        ...rest, 
        temperature: isNaN(Number(rest.temperature)) ? 0 : Number(rest.temperature),
        rainfall: isNaN(Number(rest.rainfall)) ? 0 : Number(rest.rainfall),
        userId: user.uid 
      };

      if (editingId) {
        await updateDoc(doc(db, 'weatherRecords', editingId), data);
      } else {
        await addDoc(collection(db, 'weatherRecords'), data);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        condition: 'Sunny',
        temperature: 30,
        rainfall: 0,
        notes: ''
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || '保存失败，请重试');
      handleFirestoreError(error, OperationType.WRITE, 'weatherRecords');
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
      await deleteDoc(doc(db, 'weatherRecords', itemToDelete));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'weatherRecords');
    }
  };

  const handleEdit = (record: WeatherRecord) => {
    setEditingId(record.id!);
    setFormData(record);
    setIsModalOpen(true);
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Sunny': return <Sun className="w-6 h-6 text-amber-500" />;
      case 'Rainy': return <CloudRain className="w-6 h-6 text-blue-500" />;
      case 'Cloudy': return <Cloud className="w-6 h-6 text-slate-400" />;
      case 'Stormy': return <Zap className="w-6 h-6 text-purple-500" />;
      default: return <Sun className="w-6 h-6 text-amber-500" />;
    }
  };

  const getWeatherText = (condition: string) => {
    switch (condition) {
      case 'Sunny': return '晴天';
      case 'Rainy': return '雨天';
      case 'Cloudy': return '多云';
      case 'Stormy': return '暴雨';
      default: return '晴天';
    }
  };

  const tileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view === 'month') {
      const dayRecords = records.filter(r => isSameDay(parseISO(r.date), date));
      if (dayRecords.length > 0) {
        // Show the latest record of the day
        const latest = dayRecords[0];
        return (
          <div className="flex justify-center mt-1">
            <div className="transform scale-75 md:scale-100">
              {getWeatherIcon(latest.condition)}
            </div>
          </div>
        );
      }
    }
    return null;
  };

  const handlePrint = () => {
    console.log("Attempting to print...");
    window.focus();
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        console.error("Print failed:", e);
        alert("打印功能在当前预览窗口受限。请点击右上角按钮‘在新窗口打开’后再试。");
      }
    }, 200);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">天气记录</h1>
          <p className="text-slate-500">记录每日天气，分析气候对作物的影响</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 p-1 rounded-xl flex border border-emerald-100">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-700/50 hover:text-emerald-700'}`}
            >
              日历视图
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-700/50 hover:text-emerald-700'}`}
            >
              列表视图
            </button>
            <button
              onClick={() => setViewMode('report')}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'report' ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-700/50 hover:text-emerald-700'}`}
            >
              年度报告
            </button>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                condition: 'Sunny',
                temperature: 30,
                rainfall: 0,
                notes: ''
              });
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20 font-bold"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">记录天气</span>
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-emerald-100"
        >
          <style>{`
            .react-calendar {
              width: 100%;
              border: none;
              font-family: inherit;
            }
            .react-calendar__tile {
              padding: 1.5em 0.5em !important;
              height: auto;
              min-height: 80px;
              display: flex;
              flex-direction: column;
              align-items: center;
              border-radius: 16px;
              transition: all 0.2s;
            }
            .react-calendar__tile:hover {
              background-color: #f0fdf4 !important;
            }
            .react-calendar__tile--active {
              background: #ecfdf5 !important;
              color: #059669 !important;
              font-weight: bold;
            }
            .react-calendar__tile--now {
              background: #f0fdf4 !important;
              border: 1px solid #10b981 !important;
            }
            .react-calendar__navigation button:enabled:hover,
            .react-calendar__navigation button:enabled:focus {
              background-color: #f0fdf4;
              border-radius: 12px;
            }
            .react-calendar__month-view__days__day--weekend {
              color: #ef4444;
            }
            .react-calendar__month-view__weekdays__weekday {
              font-weight: bold;
              color: #059669;
              opacity: 0.6;
              text-decoration: none;
              padding: 10px 0;
              text-transform: uppercase;
              font-size: 0.75rem;
            }
            abbr[title] {
              text-decoration: none;
            }
          `}</style>
          <CalendarComponent
            tileContent={tileContent}
            className="weather-calendar"
            onClickDay={(date) => {
              const dayRecords = records.filter(r => isSameDay(parseISO(r.date), date));
              if (dayRecords.length > 0) {
                handleEdit(dayRecords[0]);
              } else {
                setEditingId(null);
                setFormData({
                  date: format(date, "yyyy-MM-dd'T'12:00"),
                  condition: 'Sunny',
                  temperature: 30,
                  rainfall: 0,
                  notes: ''
                });
                setIsModalOpen(true);
              }
            }}
          />
          <div className="mt-8 flex flex-wrap justify-center gap-6 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900/70">
              <Sun className="w-5 h-5 text-amber-500" /> 晴天
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900/70">
              <CloudRain className="w-5 h-5 text-blue-500" /> 雨天
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900/70">
              <Cloud className="w-5 h-5 text-emerald-400" /> 多云
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900/70">
              <Zap className="w-5 h-5 text-purple-500" /> 暴雨
            </div>
          </div>
        </motion.div>
      ) : viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-4">
        {records.map((record) => (
          <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={record.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                {getWeatherIcon(record.condition)}
              </div>
              <div>
                <h3 className="font-bold text-emerald-950 text-lg">{getWeatherText(record.condition)}</h3>
                <span className="text-sm text-emerald-600/60 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(record.date), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-8">
              <div className="flex gap-6">
                {record.temperature !== undefined && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-rose-500 font-black">
                      <Thermometer className="w-4 h-4" />
                      <span>{record.temperature}°C</span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">气温</p>
                  </div>
                )}
                {record.rainfall !== undefined && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-blue-500 font-black">
                      <Droplet className="w-4 h-4" />
                      <span>{record.rainfall}mm</span>
                    </div>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">降雨量</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(record)}
                  className="p-2 text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(record.id!)}
                  className="p-2 text-emerald-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {records.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-emerald-100">
            <Cloud className="w-12 h-12 text-emerald-100 mx-auto mb-4" />
            <p className="text-emerald-300 font-medium">还没有天气记录，开始记录当天的天气吧！</p>
          </div>
        )}
      </div>
      ) : (
        <div className="space-y-6">
          {/* Report Filter */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-emerald-900/60">选择年份:</label>
              <select 
                value={reportYear}
                onChange={(e) => setReportYear(parseInt(e.target.value))}
                className="bg-emerald-50 border-none rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all border border-emerald-100 cursor-pointer"
              title="打印报告"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 border-b border-emerald-100">
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">月份</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">天气概况</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">平均气温</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">总降雨量</th>
                    <th className="px-6 py-4 text-xs font-black text-emerald-900/40 uppercase tracking-widest">记录天数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {Array.from({ length: 12 }, (_, i) => i).map(monthIdx => {
                    const monthRecords = records.filter(r => {
                      const d = parseISO(r.date);
                      return d.getFullYear() === reportYear && d.getMonth() === monthIdx;
                    });

                    const avgTemp = monthRecords.length > 0 
                      ? monthRecords.reduce((acc: number, curr) => acc + (curr.temperature || 0), 0) / monthRecords.length 
                      : 0;
                    const totalRain = monthRecords.reduce((acc: number, curr) => acc + (curr.rainfall || 0), 0);
                    
                    const conditions = monthRecords.reduce((acc: Record<string, number>, curr) => {
                      acc[curr.condition] = (acc[curr.condition] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);

                    const topCondition = Object.entries(conditions).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

                    return (
                      <tr key={monthIdx} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-emerald-950">{monthIdx + 1}月</td>
                        <td className="px-6 py-4">
                          {topCondition ? (
                            <div className="flex items-center gap-2">
                              {getWeatherIcon(topCondition)}
                              <span className="text-sm font-medium text-emerald-700">{getWeatherText(topCondition)}为主</span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-300 italic">无记录</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-rose-500">{avgTemp > 0 ? `${avgTemp.toFixed(1)}°C` : '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-blue-500">{totalRain > 0 ? `${totalRain.toFixed(1)}mm` : '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg">{monthRecords.length} 天</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-50"
            >
              <div className="p-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
                <h2 className="text-xl font-bold text-emerald-950">{editingId ? '编辑天气' : '新增天气记录'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-emerald-300 hover:text-emerald-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">
                    {submitError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">日期时间</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">天气状况</label>
                    <select
                      value={formData.condition}
                      onChange={e => setFormData({ ...formData, condition: e.target.value as any })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    >
                      <option value="Sunny">晴天 (Sunny)</option>
                      <option value="Rainy">雨天 (Rainy)</option>
                      <option value="Cloudy">多云 (Cloudy)</option>
                      <option value="Stormy">暴雨 (Stormy)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">气温 (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={isNaN(formData.temperature as number) ? '' : formData.temperature}
                      onChange={e => setFormData({ ...formData, temperature: e.target.value === '' ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-emerald-900/70 ml-1">降雨量 (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={isNaN(formData.rainfall as number) ? '' : formData.rainfall}
                      onChange={e => setFormData({ ...formData, rainfall: e.target.value === '' ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-bold text-emerald-900/70 ml-1">备注</label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none font-medium"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
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
                    {isSubmitting ? '正在提交...' : (editingId ? '保存修改' : '确认记录')}
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
              className="absolute inset-0 bg-emerald-950/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center border border-emerald-50"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-emerald-950 mb-2">确认删除？</h3>
              <p className="text-emerald-600/60 mb-8 font-medium">您确定要删除这条天气记录吗？此操作无法撤销。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-2xl transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-600/20"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
