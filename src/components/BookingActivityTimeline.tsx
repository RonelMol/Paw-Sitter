import React, { useState } from "react";
import { 
  Clock, 
  Utensils, 
  Footprints, 
  Pill, 
  Sparkles, 
  HeartHandshake, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Info, 
  AlertCircle,
  CalendarCheck,
  Wand2,
  Check
} from "lucide-react";

export interface CareActivityItem {
  id: string;
  title: string;
  activityType: "FEEDING" | "WALK" | "MEDICATION" | "POTTY" | "PLAY" | "OTHER";
  scheduledTime: string;
  instructions: string;
  isRequired: boolean;
  petId?: number;
  petName?: string;
}

interface BookingActivityTimelineProps {
  activities: CareActivityItem[];
  onChange: (activities: CareActivityItem[]) => void;
  preferredStartTime: string;
  preferredEndTime: string;
  startDate: string;
  endDate: string;
  pets?: { id: number; name: string; type?: string }[];
}

export function BookingActivityTimeline({
  activities,
  onChange,
  preferredStartTime,
  preferredEndTime,
  startDate,
  endDate,
  pets = [],
}: BookingActivityTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [activityType, setActivityType] = useState<CareActivityItem["activityType"]>("FEEDING");
  const [time, setTime] = useState(preferredStartTime || "08:00");
  const [instructions, setInstructions] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [selectedPetName, setSelectedPetName] = useState("All Pets");

  // Helper icons
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "FEEDING":
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case "WALK":
        return <Footprints className="w-4 h-4 text-emerald-600" />;
      case "MEDICATION":
        return <Pill className="w-4 h-4 text-rose-600" />;
      case "POTTY":
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      case "PLAY":
        return <HeartHandshake className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "FEEDING":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "WALK":
        return "bg-emerald-50 border-emerald-200 text-emerald-800";
      case "MEDICATION":
        return "bg-rose-50 border-rose-200 text-rose-800";
      case "POTTY":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "PLAY":
        return "bg-purple-50 border-purple-200 text-purple-800";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800";
    }
  };

  // 1-Click Generate Default Routine
  const handleGenerateDefaultRoutine = () => {
    const routine: CareActivityItem[] = [
      {
        id: "act-1",
        title: "Morning Breakfast & Fresh Water",
        activityType: "FEEDING",
        scheduledTime: preferredStartTime ? `${preferredStartTime}` : "08:00",
        instructions: "Fresh bowl of dry kibble and fill water bowl to the brim.",
        isRequired: false, // optional as requested
      },
      {
        id: "act-2",
        title: "Morning Neighborhood Walk",
        activityType: "WALK",
        scheduledTime: "09:30",
        instructions: "20-30 min brisk walk. Sniff breaks encouraged, keep on 6ft leash.",
        isRequired: false,
      },
      {
        id: "act-3",
        title: "Midday Backyard Potty Break",
        activityType: "POTTY",
        scheduledTime: "13:00",
        instructions: "Quick outdoor relief and check water bowl.",
        isRequired: false,
      },
      {
        id: "act-4",
        title: "Evening Dinner & Medication",
        activityType: "FEEDING",
        scheduledTime: "18:00",
        instructions: "Evening meal. Add any prescribed supplements or chew.",
        isRequired: false,
      },
      {
        id: "act-5",
        title: "Bedtime Relief & Night Tuck-in",
        activityType: "POTTY",
        scheduledTime: preferredEndTime ? `${preferredEndTime}` : "21:00",
        instructions: "Final backyard potty check and tuck into sleeping bed.",
        isRequired: false,
      },
    ];
    onChange(routine);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const chosenPet = pets.find(p => p.name === selectedPetName);

    const newItem: CareActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      activityType,
      scheduledTime: time,
      instructions: instructions.trim(),
      isRequired,
      petName: selectedPetName === "All Pets" ? undefined : selectedPetName,
      petId: chosenPet ? chosenPet.id : undefined,
    };

    // Keep activities sorted by time
    const updated = [...activities, newItem].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    onChange(updated);

    // Reset form
    setTitle("");
    setInstructions("");
    setIsRequired(false);
    setShowAddForm(false);
  };

  const handleToggleRequired = (id: string) => {
    onChange(
      activities.map((a) => (a.id === id ? { ...a, isRequired: !a.isRequired } : a))
    );
  };

  const handleDeleteActivity = (id: string) => {
    onChange(activities.filter((a) => a.id !== id));
  };

  const handleQuickAdd = (type: CareActivityItem["activityType"], defaultTitle: string, defaultTime: string) => {
    const chosenPet = pets.find(p => p.name === selectedPetName);
    const newItem: CareActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: defaultTitle,
      activityType: type,
      scheduledTime: defaultTime,
      instructions: "",
      isRequired: false, // explicitly optional
      petName: selectedPetName === "All Pets" ? undefined : selectedPetName,
      petId: chosenPet ? chosenPet.id : undefined,
    };
    const updated = [...activities, newItem].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* Informational Guidance Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Pet Care Routine Timeline</h3>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Optional
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              Define the schedule of activities for your pet (meals, walks, medication, potty breaks). Sitters see this timeline in their Live Tracker and check off each event. <strong className="text-slate-800">All activities are optional recommendations</strong> unless you mark them as required.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-start md:self-auto">
          <button
            type="button"
            onClick={handleGenerateDefaultRoutine}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Wand2 className="w-3.5 h-3.5" /> Auto-Fill Recommended
          </button>
          {activities.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Presets Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Quick Add:
        </span>
        <button
          type="button"
          onClick={() => handleQuickAdd("FEEDING", "Morning Meal & Fresh Water", "08:00")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors"
        >
          <Utensils className="w-3 h-3" /> Breakfast (8:00 AM)
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd("WALK", "Outdoor Dog Walk", "09:30")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
        >
          <Footprints className="w-3 h-3" /> Walk (9:30 AM)
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd("POTTY", "Midday Potty Break", "13:00")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium transition-colors"
        >
          <Sparkles className="w-3 h-3" /> Potty (1:00 PM)
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd("FEEDING", "Evening Dinner & Refresh", "18:00")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors"
        >
          <Utensils className="w-3 h-3" /> Dinner (6:00 PM)
        </button>
        <button
          type="button"
          onClick={() => handleQuickAdd("MEDICATION", "Prescription / Supplement", "19:00")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
        >
          <Pill className="w-3 h-3" /> Medication
        </button>
      </div>

      {/* Main Activity Timeline Display */}
      {activities.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-800 text-sm">No Custom Activities Scheduled Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            This step is completely optional. If you skip, your sitter will provide standard attentive care and updates throughout the visit.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleGenerateDefaultRoutine}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Wand2 className="w-3.5 h-3.5" /> Auto-Fill Recommended Routine
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Custom Activity
            </button>
          </div>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {activities.map((act, index) => {
            const timeFormatted = (() => {
              const [hStr, mStr] = act.scheduledTime.split(":");
              const h = parseInt(hStr, 10);
              if (isNaN(h)) return act.scheduledTime;
              const ampm = h >= 12 ? "PM" : "AM";
              const h12 = h % 12 === 0 ? 12 : h % 12;
              return `${h12}:${mStr || "00"} ${ampm}`;
            })();

            return (
              <div key={act.id} className="relative group">
                {/* Node indicator on the vertical line */}
                <div className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                  act.isRequired 
                    ? "border-amber-500 text-amber-600 shadow-sm" 
                    : "border-slate-300 text-slate-500"
                }`}>
                  <span className="text-[10px] font-bold">{index + 1}</span>
                </div>

                {/* Card */}
                <div className={`p-4 rounded-xl border bg-white shadow-sm hover:shadow transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  act.isRequired ? "border-amber-300/80 bg-amber-50/20" : "border-slate-200"
                }`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${getActivityColor(act.activityType)}`}>
                      {getActivityIcon(act.activityType)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{act.title}</span>
                        {act.petName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                            🐾 For: {act.petName}
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {timeFormatted}
                        </span>
                        {act.isRequired ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                            ★ Required Task
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            Optional Plan
                          </span>
                        )}
                      </div>
                      {act.instructions ? (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{act.instructions}</p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Standard routine instructions</p>
                      )}
                    </div>
                  </div>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleRequired(act.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        act.isRequired
                          ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                      title={act.isRequired ? "Click to set as optional" : "Click to mark as required"}
                    >
                      {act.isRequired ? "Marked Required" : "Set Required"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(act.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete activity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Button to open custom activity modal/drawer */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 rounded-xl text-xs font-bold text-slate-600 hover:text-emerald-800 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4 text-emerald-600" /> Add Another Activity or Care Task
        </button>
      ) : (
        <form onSubmit={handleAddActivity} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" /> New Scheduled Activity
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Afternoon Medication or 30-min Dog Park Walk"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Pet</label>
              <select
                value={selectedPetName}
                onChange={(e) => setSelectedPetName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="All Pets">🐾 All Pets (Whole Booking)</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.name}>🐾 {p.name} {p.type ? `(${p.type})` : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="FEEDING">🥣 Feeding & Fresh Water</option>
                <option value="WALK">🦮 Dog Walk / Outdoor Exercise</option>
                <option value="MEDICATION">💊 Medication / Supplements</option>
                <option value="POTTY">🐾 Potty / Litterbox Break</option>
                <option value="PLAY">🎾 Playtime & Snuggles</option>
                <option value="OTHER">✨ General Check-in</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Option</label>
              <label className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Mark as <strong className="text-amber-700">Required</strong>
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions (Optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="e.g. 1 cup salmon kibble with warm water; give flea chew after food"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Save to Timeline
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
