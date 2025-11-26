"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; 
import BottomNav from "../../components/BottomNav";

export default function HistoryPage() {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("workout_logs")
          .select(`
            id, weight, reps, created_at,
            exercises (name)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        if (!data) {
             setLoading(false);
             return;
        }

        const groupedByWeek: any = {};

        data.forEach((log) => {
          if (!log.created_at) return;

          const logDate = new Date(log.created_at);
          const monday = getMonday(logDate);
          const weekKey = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const dayName = logDate.toLocaleDateString("en-US", { weekday: "long" });
          const fullDate = logDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          if (!groupedByWeek[weekKey]) groupedByWeek[weekKey] = {};
          if (!groupedByWeek[weekKey][dayName]) {
            groupedByWeek[weekKey][dayName] = { name: dayName, date: fullDate, logs: [] };
          }
          
          groupedByWeek[weekKey][dayName].logs.push(log);
        });

        const weeksArray = Object.keys(groupedByWeek).map((weekLabel) => {
          const daysObj = groupedByWeek[weekLabel];
          const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
          const sortedDays = dayOrder
            .filter(day => daysObj[day])
            .map(day => daysObj[day]);

          return { weekLabel, days: sortedDays };
        });

        setWeeks(weeksArray);
      } catch (err: any) {
        console.error("History Crash:", err);
        setErrorMsg(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getSplitTag = (logs: any[]) => {
    const names = logs.map(l => l.exercises?.name?.toLowerCase() || "").join(" ");
    if (names.includes("squat") || names.includes("leg")) return "LEGS";
    if (names.includes("bench") || names.includes("press") || names.includes("extension")) return "PUSH";
    if (names.includes("deadlift") || names.includes("row") || names.includes("curl") || names.includes("pull")) return "PULL";
    return "WORKOUT";
  };

  const getSplitColor = (tag: string) => {
    if (tag === "PUSH") return "bg-red-100 text-red-800 border-red-200";
    if (tag === "PULL") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (tag === "LEGS") return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-600";
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white p-4 shadow-sm border-b sticky top-0 z-10">
        <h1 className="text-2xl font-extrabold text-gray-800">History</h1>
      </header>

      {errorMsg && (
        <div className="bg-red-100 text-red-800 p-4 m-4 rounded-xl border border-red-200">
            <strong>Error loading history:</strong> {errorMsg}
        </div>
      )}

      <div className="p-4 max-w-md mx-auto space-y-8">
        {loading ? (
          <div className="text-center py-10 text-gray-400 animate-pulse">Loading history...</div>
        ) : weeks.length === 0 && !errorMsg ? (
            <div className="text-center py-10 text-gray-400">No history found. Go log a set!</div>
        ) : (
          weeks.map((week) => (
            <div key={week.weekLabel}>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">WEEK</span>
                <h2 className="text-lg font-bold text-gray-500">of {week.weekLabel}</h2>
              </div>

              <div className="space-y-4 border-l-2 border-gray-200 pl-4 ml-2">
                {week.days.map((day: any) => {
                    const splitTag = getSplitTag(day.logs);
                    return (
                        <div key={day.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="flex justify-between items-center p-3 border-b border-gray-50 bg-gray-50/50">
                                <div>
                                    <h3 className="font-bold text-gray-800">{day.name}</h3>
                                    <p className="text-xs text-gray-400">{day.date}</p>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded border ${getSplitColor(splitTag)}`}>{splitTag}</span>
                            </div>
                            <div className="p-3 pt-2">
                                {Object.entries(day.logs.reduce((acc: any, log: any) => {
                                    const name = log.exercises?.name || "Unknown Exercise";
                                    if (!acc[name]) acc[name] = [];
                                    acc[name].push(log);
                                    return acc;
                                }, {})).map(([exerciseName, sets]: [string, any]) => (
                                <div key={exerciseName} className="mb-2 last:mb-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-sm font-semibold text-gray-700">{exerciseName}</span>
                                        <span className="text-xs text-gray-400">{sets.length} sets</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                    {sets.map((set: any) => (
                                        <span key={set.id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        {set.weight}x{set.reps}
                                        </span>
                                    ))}
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </main>
  );
}