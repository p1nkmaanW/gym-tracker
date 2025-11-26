"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProgressChart({ exerciseId }: { exerciseId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch entire history for this exercise
      const { data: logs } = await supabase
        .from('workout_logs')
        .select('weight, reps, created_at')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: true }); // Oldest first

      if (logs && logs.length > 0) {
        // Process data: Group by day and find the BEST set of that day (Highest 1RM)
        const bestSetsByDay: any = {};

        logs.forEach(log => {
          const date = new Date(log.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
          const oneRM = Math.round(log.weight * (1 + log.reps / 30));

          if (!bestSetsByDay[date] || oneRM > bestSetsByDay[date].oneRM) {
            bestSetsByDay[date] = { date, oneRM };
          }
        });

        setData(Object.values(bestSetsByDay));
      }
      setLoading(false);
    };

    if (exerciseId) fetchData();
  }, [exerciseId]);

  if (loading) return <div className="text-xs text-gray-400 animate-pulse">Loading Chart...</div>;
  if (data.length < 2) return <div className="text-xs text-gray-400 p-4 text-center">Log more workouts to see a chart!</div>;

  return (
    <div className="w-full h-48 bg-white rounded-xl shadow-sm border border-gray-100 p-2 my-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 ml-2">Estimated 1 Rep Max Progress</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#2563eb', fontWeight: 'bold' }}
          />
          <Line 
            type="monotone" 
            dataKey="oneRM" 
            stroke="#2563eb" 
            strokeWidth={3} 
            dot={{ r: 3, fill: '#2563eb' }} 
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}