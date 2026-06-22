import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { YieldRecord, ActivityRecord, WeatherRecord, AttendanceRecord, OperationType } from '../types';
import { handleFirestoreError, getTypeText } from '../utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, Package, Droplets, Calendar, Users, Thermometer, CloudRain, MapPin, ChevronRight, Sprout, Check } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { useCrops } from '../hooks/useCrops';
import { useLocations } from '../hooks/useLocations';
import { Link } from 'react-router-dom';
import { Crop } from '../types';

export default function Dashboard({ 
  user, 
  selectedCrop, 
  crops, 
  cropsLoading 
}: { 
  user: User, 
  selectedCrop: string, 
  crops: Crop[], 
  cropsLoading: boolean 
}) {
  const [yields, setYields] = useState<YieldRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [weather, setWeather] = useState<WeatherRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [matrixActivityFilter, setMatrixActivityFilter] = useState<string>('All');
  const [matrixYear, setMatrixYear] = useState<number>(new Date().getFullYear());
  const { locations, loading: locationsLoading } = useLocations(user);

  useEffect(() => {
    if (!user) return;

    const yieldQuery = query(
      collection(db, 'yieldRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(200)
    );

    const activityQuery = query(
      collection(db, 'activityRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(100)
    );

    const weatherQuery = query(
      collection(db, 'weatherRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(200)
    );

    const attendanceQuery = query(
      collection(db, 'attendanceRecords'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(200)
    );

    const unsubYield = onSnapshot(yieldQuery, (snapshot) => {
      setYields(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as YieldRecord)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'yieldRecords'));

    const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activityRecords'));

    const unsubWeather = onSnapshot(weatherQuery, (snapshot) => {
      setWeather(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeatherRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'weatherRecords'));

    const unsubAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendanceRecords'));

    return () => {
      unsubYield();
      unsubActivity();
      unsubWeather();
      unsubAttendance();
    };
  }, [user]);

  const filteredYields = yields.filter(y => y.cropType === selectedCrop);
  const filteredActivities = activities.filter(a => a.cropType === selectedCrop);
  const filteredAttendance = attendance.filter(a => a.cropType === selectedCrop);

  const now = new Date();
  
  const getMonthData = (date: Date) => {
    const interval = { start: startOfMonth(date), end: endOfMonth(date) };
    const monthYield = filteredYields
      .filter(y => isWithinInterval(parseISO(y.date), interval))
      .reduce((sum, y) => sum + y.quantity, 0);
    return {
      label: format(date, 'M月'),
      yield: monthYield
    };
  };

  const lastThreeMonthsData = [
    getMonthData(now),
    getMonthData(subMonths(now, 1)),
    getMonthData(subMonths(now, 2)),
  ];

  const currentMonthInterval = { start: startOfMonth(now), end: endOfMonth(now) };
  const currentMonthAttendance = filteredAttendance
    .filter(a => isWithinInterval(parseISO(a.date), currentMonthInterval))
    .reduce((sum, a) => sum + a.workerIds.length, 0);

  const pendingActivities = filteredActivities.filter(a => a.status === 'Pending');
  const pendingActivitiesCount = pendingActivities.length;

  // Matrix data for annual activity completion
  const uniqueActivityTypes = Array.from(new Set(filteredActivities.map(a => getTypeText(a.type)))).sort() as string[];
  const months = Array.from({ length: 12 }, (_, i) => i);

  const isActivityCompleted = (locationName: string, month: number, typeFilter: string) => {
    return filteredActivities.some(a => {
      const date = parseISO(a.date);
      const isCorrectYear = date.getFullYear() === matrixYear;
      const isCorrectMonth = date.getMonth() === month;
      const isCorrectLocation = a.location === locationName;
      const isCorrectStatus = a.status === 'Completed';
      const isCorrectType = typeFilter === 'All' ? true : getTypeText(a.type) === typeFilter;
      
      return isCorrectYear && isCorrectMonth && isCorrectLocation && isCorrectStatus && isCorrectType;
    });
  };

  const currentMonthWeather = weather.filter(w => isWithinInterval(parseISO(w.date), currentMonthInterval));
  const avgTemp = currentMonthWeather.length > 0 
    ? currentMonthWeather.reduce((sum, w) => sum + (w.temperature || 0), 0) / currentMonthWeather.length 
    : 0;
  const totalRain = currentMonthWeather.reduce((sum, w) => sum + (w.rainfall || 0), 0);

  const getYearData = (date: Date) => {
    const interval = { start: startOfYear(date), end: endOfYear(date) };
    const yearYield = filteredYields
      .filter(y => isWithinInterval(parseISO(y.date), interval))
      .reduce((sum, y) => sum + y.quantity, 0);
    return {
      label: format(date, 'yyyy年'),
      yield: yearYield
    };
  };

  const lastThreeYearsData = [
    getYearData(now),
    getYearData(subYears(now, 1)),
    getYearData(subYears(now, 2)),
  ];

  // Data processing for charts
  const monthlyStats = Array.from({ length: 6 }, (_, i) => {
    const d = subDays(now, i * 30);
    const month = format(d, 'MMM yyyy');
    const interval = { start: startOfMonth(d), end: endOfMonth(d) };

    const monthYield = filteredYields
      .filter(y => isWithinInterval(parseISO(y.date), interval))
      .reduce((sum, y) => sum + y.quantity, 0);

    const monthAttendance = filteredAttendance
      .filter(a => isWithinInterval(parseISO(a.date), interval))
      .reduce((sum, a) => sum + a.workerIds.length, 0);

    const monthWeather = weather.filter(w => isWithinInterval(parseISO(w.date), interval));
    
    const conditions = monthWeather.reduce((acc: Record<string, number>, curr) => {
      acc[curr.condition] = (acc[curr.condition] || 0) + 1;
      return acc;
    }, {});

    return { 
      month, 
      yield: monthYield, 
      attendance: monthAttendance,
      Sunny: conditions['Sunny'] || 0,
      Rainy: conditions['Rainy'] || 0,
      Cloudy: conditions['Cloudy'] || 0,
      Stormy: conditions['Stormy'] || 0
    };
  }).reverse();

  const yieldByLocation = filteredYields.reduce((acc: any[], curr) => {
    const month = format(parseISO(curr.date), 'MMM yyyy');
    const location = curr.location || '未记录地点';
    let existing = acc.find(item => item.location === location);
    if (!existing) {
      existing = { location };
      acc.push(existing);
    }
    existing[month] = (existing[month] || 0) + curr.quantity;
    return acc;
  }, []);

  const monthNames = Array.from(new Set(filteredYields.map(y => format(parseISO(y.date), 'MMM yyyy'))))
    .sort((a, b) => new Date(a as string).getTime() - new Date(b as string).getTime()) as string[];

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading || cropsLoading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-emerald-50/50 rounded-2xl border border-emerald-100/50" />)}
    </div>
    <div className="h-96 bg-emerald-50/50 rounded-2xl border border-emerald-100/50" />
  </div>;

  if (crops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Sprout className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-emerald-950 mb-2 font-serif">欢迎使用 SRI KANCIL</h2>
        <p className="text-emerald-700/60 mb-8 max-w-md">在开始记录之前，请先添加您农场种植的作物种类。</p>
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
    <div className="space-y-8">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-emerald-950">管理分析仪表盘</h1>
          <p className="text-emerald-600/60">实时监控农场核心指标与趋势</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          title="最近3个月产量明细" 
          value={
            <div className="space-y-1">
              {lastThreeMonthsData.map((m, i) => (
                <div key={i} className="flex justify-between items-center gap-4">
                  <span className="text-sm font-bold text-emerald-800/60">{m.label}</span>
                  <span className="text-lg font-black text-emerald-950">{m.yield.toFixed(3)} kg</span>
                </div>
              ))}
            </div>
          }
          icon={<TrendingUp className="text-emerald-600" />}
          trend={`${selectedCrop}`}
          color="emerald"
        />
        <StatCard 
          title="最近3年产量明细" 
          value={
            <div className="space-y-1">
              {lastThreeYearsData.map((y, i) => (
                <div key={i} className="flex justify-between items-center gap-4">
                  <span className="text-sm font-bold text-blue-800/60">{y.label}</span>
                  <span className="text-lg font-black text-slate-800">{y.yield.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg</span>
                </div>
              ))}
            </div>
          }
          icon={<TrendingUp className="text-blue-600" />}
          trend={`${selectedCrop} 年度对比`}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Yield Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
          <h3 className="text-lg font-bold text-emerald-950 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            {selectedCrop} 产量趋势
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height={320} minWidth={0} debounce={100}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#059669', fontSize: 12, opacity: 0.6 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#059669', fontSize: 12, opacity: 0.6 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #ecfdf5', boxShadow: '0 10px 25px -5px rgb(16 185 129 / 0.1)' }}
                  cursor={{ fill: '#f0fdf4' }}
                  formatter={(value: number) => [`${value.toLocaleString()} kg`, '产量']}
                />
                <Bar dataKey="yield" name="产量 (kg)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Location Yield Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
          <h3 className="text-lg font-bold text-emerald-950 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            各地点产量分析
          </h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height={380} minWidth={0} debounce={100}>
              <BarChart data={yieldByLocation} margin={{ bottom: 100 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                <XAxis 
                  dataKey="location" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#059669', fontSize: 10, opacity: 0.6 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#059669', fontSize: 10, opacity: 0.6 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #ecfdf5', 
                    boxShadow: '0 10px 25px -5px rgb(16 185 129 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemSorter={(item: any) => -monthNames.indexOf(item.dataKey)}
                  formatter={(value: number, name: string) => [`${value.toFixed(3)} kg`, name]}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }}
                />
                {monthNames.map((month, index) => (
                  <Bar 
                    key={month} 
                    dataKey={month} 
                    stackId="a" 
                    fill={COLORS[index % COLORS.length]} 
                    radius={index === monthNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Condition Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
          <h3 className="text-lg font-bold text-emerald-950 mb-6 flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-emerald-500" />
            天气概况统计 (天数)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height={320} minWidth={0} debounce={100}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#059669', fontSize: 10, opacity: 0.6 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#059669', fontSize: 10, opacity: 0.6 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #ecfdf5', boxShadow: '0 10px 25px -5px rgb(16 185 129 / 0.1)' }}
                  formatter={(value: number, name: string) => [`${value} 天`, name]}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Sunny" name="晴天" stackId="weather" fill="#f59e0b" />
                <Bar dataKey="Cloudy" name="多云" stackId="weather" fill="#94a3b8" />
                <Bar dataKey="Rainy" name="雨天" stackId="weather" fill="#3b82f6" />
                <Bar dataKey="Stormy" name="暴雨" stackId="weather" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Pending Activities List */}
      {pendingActivities.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 bg-rose-50/10">
          <h3 className="text-lg font-bold text-rose-950 mb-6 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-rose-500 animate-pulse" />
            待完成事项清单
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingActivities.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full uppercase tracking-wider">
                      {getTypeText(item.type)}
                    </span>
                    <span className="text-[10px] text-slate-400">{format(parseISO(item.date), 'yyyy-MM-dd')}</span>
                  </div>
                  <p className="font-bold text-slate-800 mb-1">{item.materialUsed}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {item.location} {item.area && `(${item.area})`}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-600">{item.quantity} {item.unit}</span>
                  <Link 
                    to="/calendar" 
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                  >
                    去完成 <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annual Farm Activity Matrix */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            {matrixYear}年 农事年度完成情况
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={matrixYear}
              onChange={(e) => setMatrixYear(parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold text-emerald-900 bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[0, 1, 2].map(i => {
                const year = now.getFullYear() - i;
                return <option key={year} value={year}>{year}年</option>;
              })}
            </select>
            <select
              value={matrixActivityFilter}
              onChange={(e) => setMatrixActivityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-bold text-emerald-900 bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[150px]"
            >
              <option value="All">所有活动类型</option>
              {uniqueActivityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-emerald-50">
                <th className="py-3 px-2 text-[10px] font-black text-emerald-800/40 uppercase tracking-widest sticky left-0 bg-white z-10 min-w-[120px]">地点</th>
                {months.map(m => (
                  <th key={m} className="py-3 px-1 text-[10px] font-black text-emerald-800/40 uppercase tracking-widest text-center min-w-[40px]">
                    {m + 1}月
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {locationsLoading ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-emerald-300 animate-pulse">加载地点数据...</td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-emerald-300">暂无地点记录</td>
                </tr>
              ) : (
                [...locations].sort((a, b) => 
                  (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
                ).map((loc) => (
                  <tr key={loc.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="py-4 px-2 font-bold text-emerald-900 sticky left-0 bg-white group-hover:bg-emerald-50/30 z-10 border-r border-emerald-50">{loc.name}</td>
                    {months.map(m => {
                      const completed = isActivityCompleted(loc.name, m, matrixActivityFilter);
                      return (
                        <td key={m} className="py-4 px-1 text-center">
                          {completed && (
                            <div className="flex justify-center">
                              <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4 text-[10px] text-emerald-600/60 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <Check className="w-2 h-2 text-emerald-500" />
            </div>
            <span>代表该月有已完成记录</span>
          </div>
          <p>* 仅显示状态为“已完成”的记录</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: string | React.ReactNode, icon: React.ReactNode, trend: string, color: string }) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }[color] || 'bg-slate-50 text-slate-600 border-slate-100';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-50 hover:shadow-md hover:border-emerald-200 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl border ${colorClasses} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="flex-1">
          {typeof value === 'string' ? (
            <h4 className="text-2xl font-black text-emerald-950">{value}</h4>
          ) : (
            value
          )}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${colorClasses} ml-4`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
