"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase"; 
import BottomNav from "../components/BottomNav"; 
import ProgressChart from "../components/ProgressChart"; 
import confetti from "canvas-confetti"; 

export default function Home() {
  const router = useRouter(); 
  const selectRef = useRef<HTMLSelectElement>(null);

  // --- CORE STATE ---
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("Push");
  const [sets, setSets] = useState([{ weight: "", reps: "" }]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // --- HISTORY STATE ---
  const [lastSessionLogs, setLastSessionLogs] = useState<any[]>([]); 
  const [lastSessionDate, setLastSessionDate] = useState<string>("");
  const [personalBest, setPersonalBest] = useState<number>(0);

  // --- UI STATE ---
  const [showChart, setShowChart] = useState(false);
  const [restTimer, setRestTimer] = useState(0); 
  const [timerActive, setTimerActive] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState(120); // Default 2 mins

  // 1. Fetch Exercises
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) throw error;
        if (data) setExercises(data);
      } catch (err) {
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    };
    fetchExercises();
  }, []);

  const filteredExercises = exercises.filter(ex => ex.category === selectedCategory);
  const currentExercise = exercises.find(e => e.id === selectedExerciseId);
  
  // Auto-select first exercise
  useEffect(() => {
    if (filteredExercises.length > 0) {
        setSelectedExerciseId(filteredExercises[0].id);
    } else {
        setSelectedExerciseId(0);
    }
  }, [selectedCategory, exercises]);

  // 2. Fetch History & Calculate PR
  useEffect(() => {
    if (!selectedExerciseId) return;

    // <--- NEW: Calculate Suggested Rest Time based on Muscle
    const target = currentExercise?.target_muscle?.toLowerCase() || "";
    const isBigMuscle = target.includes("chest") || target.includes("pec") || target.includes("lat") || target.includes("back") || target.includes("quad") || target.includes("leg") || target.includes("chain");
    setSuggestedTime(isBigMuscle ? 180 : 120);

    const fetchHistoryData = async () => {
      setLastSessionLogs([]);
      setLastSessionDate("");
      setPersonalBest(0);

      const { data } = await supabase
        .from('workout_logs')
        .select('weight, reps, created_at')
        .eq('exercise_id', selectedExerciseId)
        .order('weight', { ascending: false }); 

      if (data && data.length > 0) {
        setPersonalBest(data[0].weight); 

        const sortedByDate = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const lastDate = new Date(sortedByDate[0].created_at).toDateString();
        const sessionSets = sortedByDate.filter(log => new Date(log.created_at).toDateString() === lastDate);
        setLastSessionLogs(sessionSets.reverse());
        setLastSessionDate(lastDate);
      }
    };
    fetchHistoryData();
  }, [selectedExerciseId, currentExercise]);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval: any = null;
    if (timerActive && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (restTimer === 0) {
      setTimerActive(false);
      if (timerActive) navigator.vibrate([200, 100, 200, 100, 400]); // Longer Vibrate
    }
    return () => clearInterval(interval);
  }, [timerActive, restTimer]);

  const startRestTimer = () => {
    // If timer is already running, clicking again stops it
    if (timerActive) {
        setTimerActive(false);
        return;
    }
    setRestTimer(suggestedTime); // Use the calculated time
    setTimerActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- LOGGING FUNCTIONS ---
  const addSet = () => setSets([...sets, { weight: "", reps: "" }]);
  const removeSet = (index: number) => setSets(sets.filter((_, i) => i !== index));
  const updateSet = (index: number, field: string, value: string) => {
    const newSets: any = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const onFinishExercise = async () => {
    setLoading(true);
    const validSets = sets
      .filter((s) => s.weight && s.reps)
      .map((s) => ({
        exercise_id: selectedExerciseId,
        weight: parseFloat(s.weight),
        reps: parseFloat(s.reps),
      }));

    if (validSets.length === 0) {
      alert("Please enter at least one set!");
      setLoading(false);
      return;
    }

    const maxLiftInSession = Math.max(...validSets.map(s => s.weight));
    if (maxLiftInSession > personalBest) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        alert(`🏆 NEW PR! You lifted ${maxLiftInSession}kg!`);
    }

    const { error } = await supabase.from("workout_logs").insert(validSets);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setSets([{ weight: "", reps: "" }]); 
      setLastSessionLogs(validSets.map(s => ({...s, created_at: new Date()})));
      setLastSessionDate(new Date().toDateString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // OPTIONAL: Auto-start timer on finish? 
      // startRestTimer(); 
      setTimeout(() => selectRef.current?.focus(), 300);
    }
    setLoading(false);
  };

  const onFinishDay = () => {
    const hasUnsavedData = sets.some(s => s.weight !== "" || s.reps !== "");
    if (hasUnsavedData) {
        if(!window.confirm("Unsaved sets! Finish anyway?")) return;
    }
    router.push('/history');
  };

  if (pageLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading App...</div>;

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto pb-40 bg-gray-50">
      <header className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-extrabold text-gray-800">GymLog</h1>
        
        {/* TIMER BUBBLE */}
        <button 
            onClick={startRestTimer}
            className={`flex items-center gap-2 px-3 py-1 rounded-full shadow-sm font-bold text-xs transition-all border ${
                timerActive 
                ? "bg-orange-100 text-orange-600 border-orange-200 animate-pulse" 
                : "bg-white text-gray-500 border-gray-200"
            }`}
        >
            {timerActive ? (
                <span>⏱ {formatTime(restTimer)}</span>
            ) : (
                // Show the specific time based on the muscle group
                <span>💤 Rest ({suggestedTime / 60}m)</span>
            )}
        </button>
      </header>

      {/* CATEGORY SELECTOR */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-200 rounded-xl">
        {['Push', 'Pull', 'Legs'].map((cat) => (
            <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedCategory === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                }`}
            >
                {cat}
            </button>
        ))}
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Exercise</label>
            <select 
                ref={selectRef} 
                value={selectedExerciseId}
                onChange={(e) => {
                    setSelectedExerciseId(Number(e.target.value));
                    setShowChart(false); 
                }}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {filteredExercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
        </div>

        {/* INFO ROW */}
        <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded uppercase">Target</span>
                <span className="text-sm font-medium text-gray-700">{currentExercise?.target_muscle || "General"}</span>
            </div>
            <button 
                onClick={() => setShowChart(!showChart)}
                className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
                {showChart ? "Hide Chart" : "Show Progress 📈"}
            </button>
        </div>

        {showChart && <ProgressChart exerciseId={selectedExerciseId} />}

        {/* LAST SESSION BOX */}
        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-blue-400 uppercase">Last Session</span>
                <span className="text-[10px] text-blue-300 font-semibold">{lastSessionDate}</span>
            </div>
            {lastSessionLogs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {lastSessionLogs.map((log, i) => (
                        <div key={i} className="bg-white px-3 py-1.5 rounded-lg shadow-sm text-sm font-bold text-gray-700 border border-blue-100">
                           <span className="text-gray-300 text-xs mr-1">{i + 1}</span> 
                           {log.weight}kg <span className="text-blue-300">x</span> {log.reps}
                        </div>
                    ))}
                </div>
            ) : <span className="text-sm text-blue-300 italic">No history yet</span>}
        </div>

        {/* SET INPUTS */}
        <div className="grid grid-cols-10 gap-3 mb-3 text-xs font-bold text-gray-400 uppercase text-center tracking-wide">
          <div className="col-span-1">#</div>
          <div className="col-span-4">kg</div>
          <div className="col-span-4">Reps</div>
        </div>

        <div className="space-y-4">
          {sets.map((set, index) => (
            <div key={index} className="relative">
                <div className="grid grid-cols-10 gap-3 items-center">
                <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeSet(index)} disabled={sets.length === 1} 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            sets.length > 1 ? "bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500" : "bg-blue-50 text-blue-600"
                        }`}>
                        {index + 1}
                    </button>
                </div>
                <input type="number" value={set.weight} onChange={(e) => updateSet(index, "weight", e.target.value)} placeholder="0" className="col-span-4 bg-gray-50 border border-gray-100 rounded-xl p-3 text-center text-lg font-bold text-gray-800" inputMode="decimal" />
                <input type="number" value={set.reps} onChange={(e) => updateSet(index, "reps", e.target.value)} placeholder="0" className="col-span-4 bg-gray-50 border border-gray-100 rounded-xl p-3 text-center text-lg font-bold text-gray-800" inputMode="numeric" />
                </div>
                {set.weight && set.reps && (
                    <div className="absolute -bottom-3 right-1">
                        <span className="text-[9px] font-bold text-gray-300 bg-white px-1">
                            Est. 1RM: {Math.round(parseFloat(set.weight) * (1 + parseFloat(set.reps) / 30))}kg
                        </span>
                    </div>
                )}
            </div>
          ))}
        </div>

        <button onClick={addSet} className="w-full mt-6 py-3 bg-gray-50 text-gray-500 font-semibold rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"><span>+</span> Add Set</button>
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-4 max-w-md mx-auto flex flex-col gap-3">
        <button onClick={onFinishExercise} disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">
          {loading ? "Saving..." : "Finish Exercise"}
        </button>
        <button onClick={onFinishDay} className="w-full bg-white text-red-500 font-bold py-3.5 rounded-xl border border-red-100 shadow-sm hover:bg-red-50 active:scale-95 transition-all">Finish Workout</button>
      </div>

      <BottomNav />
    </main>
  );
}