import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  Sparkles,
  Info
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

interface DynamicTripCalendarProps {
  sitterId: number | string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string;   // HH:mm (24h)
  onDateChange: (start: string, end: string) => void;
  onTimeChange: (startTime: string, endTime: string) => void;
  onConflictChange?: (hasConflict: boolean, reason?: string) => void;
  modality?: string;
}

interface SitterBookingSlot {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
}

interface SitterBlockoutSlot {
  id: number;
  startDate: string;
  endDate: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Time slots from 06:00 to 22:00 in 30-min increments
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let h = 6; h <= 22; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 22 && m > 0) break;
    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    const label = `${hour12}:${mm} ${ampm}`;
    TIME_SLOTS.push({ value: `${hh}:${mm}`, label });
  }
}

export const DynamicTripCalendar: React.FC<DynamicTripCalendarProps> = ({
  sitterId,
  startDate,
  endDate,
  startTime,
  endTime,
  onDateChange,
  onTimeChange,
  onConflictChange,
  modality = "BOARDING"
}) => {
  const { user } = useAuth();
  
  // Current calendar view month/year
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, "0");
    const d = today.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Existing schedule for this sitter
  const [existingBookings, setExistingBookings] = useState<SitterBookingSlot[]>([]);
  const [existingBlockouts, setExistingBlockouts] = useState<SitterBlockoutSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // User range selection mode: 'start' or 'end'
  const [selectingStep, setSelectingStep] = useState<"start" | "end">("start");

  // Fetch Sitter's Existing Schedule to prevent double booking
  useEffect(() => {
    if (!sitterId) return;

    let isMounted = true;
    const fetchSchedule = async () => {
      setLoadingSchedule(true);
      setScheduleError(null);
      try {
        const token = user ? await user.getIdToken() : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/bookings/sitter-schedule/${sitterId}`, { headers });
        if (!res.ok) {
          throw new Error("Failed to load sitter availability");
        }
        const data = await res.json();
        if (isMounted) {
          setExistingBookings(data.bookings || []);
          setExistingBlockouts(data.blockouts || []);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn("Could not fetch sitter schedule:", err);
          setScheduleError(err.message);
        }
      } finally {
        if (isMounted) setLoadingSchedule(false);
      }
    };

    fetchSchedule();
    return () => {
      isMounted = false;
    };
  }, [sitterId, user]);

  // Compute set of all fully or partially booked dates (YYYY-MM-DD)
  const bookedDatesSet = useMemo(() => {
    const dates = new Set<string>();

    existingBookings.forEach((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      
      const cur = new Date(bStart);
      cur.setHours(0, 0, 0, 0);
      const endLimit = new Date(bEnd);
      endLimit.setHours(23, 59, 59, 999);

      while (cur <= endLimit) {
        const y = cur.getFullYear();
        const m = (cur.getMonth() + 1).toString().padStart(2, "0");
        const d = cur.getDate().toString().padStart(2, "0");
        dates.add(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
    });

    existingBlockouts.forEach((bl) => {
      const blStart = new Date(bl.startDate);
      const blEnd = new Date(bl.endDate);
      const cur = new Date(blStart);
      while (cur <= blEnd) {
        const y = cur.getFullYear();
        const m = (cur.getMonth() + 1).toString().padStart(2, "0");
        const d = cur.getDate().toString().padStart(2, "0");
        dates.add(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }
    });

    return dates;
  }, [existingBookings, existingBlockouts]);

  // Check whether current selected range conflicts with existing bookings
  const conflictDetails = useMemo(() => {
    if (!startDate || !endDate) return null;

    // 1. End date before start date
    if (endDate < startDate) {
      return { hasConflict: true, message: "End date cannot be before start date." };
    }

    // 2. Same date with end time <= start time
    if (startDate === endDate && endTime <= startTime) {
      return { hasConflict: true, message: "On the same day, end time must be after start time." };
    }

    // 3. Any date in the range is already booked
    const cur = new Date(`${startDate}T00:00:00`);
    const endObj = new Date(`${endDate}T00:00:00`);
    const conflictingDates: string[] = [];

    while (cur <= endObj) {
      const y = cur.getFullYear();
      const m = (cur.getMonth() + 1).toString().padStart(2, "0");
      const d = cur.getDate().toString().padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      if (bookedDatesSet.has(dateStr)) {
        conflictingDates.push(dateStr);
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (conflictingDates.length > 0) {
      return {
        hasConflict: true,
        message: `Double booking prevented: Sitter is already booked on ${conflictingDates.join(", ")}. Please pick alternative dates.`,
        conflictingDates
      };
    }

    // 4. Exact timestamp check against active bookings
    const reqStart = new Date(`${startDate}T${startTime}:00`);
    const reqEnd = new Date(`${endDate}T${endTime}:00`);

    for (const b of existingBookings) {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      if (bStart < reqEnd && bEnd > reqStart) {
        return {
          hasConflict: true,
          message: `Double booking prevented: Overlaps with an existing reservation from ${bStart.toLocaleDateString()} ${bStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${bEnd.toLocaleDateString()} ${bEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        };
      }
    }

    return { hasConflict: false };
  }, [startDate, endDate, startTime, endTime, bookedDatesSet, existingBookings]);

  // Notify parent of conflict state
  useEffect(() => {
    if (onConflictChange) {
      onConflictChange(conflictDetails?.hasConflict || false, conflictDetails?.message);
    }
  }, [conflictDetails, onConflictChange]);

  // Calculate duration display
  const durationSummary = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) return null;
    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;

    const totalHours = Math.round(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;

    if (days === 0) {
      return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
    }
    if (remHours === 0) {
      return `${days} day${days === 1 ? "" : "s"}`;
    }
    return `${days} day${days === 1 ? "" : "s"}, ${remHours} hr${remHours === 1 ? "" : "s"} (${totalHours} hrs total)`;
  }, [startDate, endDate, startTime, endTime]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const isCurrentMonthOrFuture = () => {
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth();
    return viewYear > nowYear || (viewYear === nowYear && viewMonth > nowMonth);
  };

  // Preset Date Selection Handlers
  const applyPreset = (preset: "today" | "tomorrow" | "weekend" | "3days" | "week") => {
    const base = new Date();
    let s = new Date(base);
    let e = new Date(base);

    if (preset === "today") {
      // today single day
    } else if (preset === "tomorrow") {
      s.setDate(s.getDate() + 1);
      e.setDate(e.getDate() + 1);
    } else if (preset === "weekend") {
      const dayOfWeek = base.getDay();
      const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
      s.setDate(base.getDate() + daysUntilSat);
      e = new Date(s);
      e.setDate(e.getDate() + 1); // Sunday
    } else if (preset === "3days") {
      s.setDate(base.getDate() + 1);
      e.setDate(s.getDate() + 2);
    } else if (preset === "week") {
      s.setDate(base.getDate() + 1);
      e.setDate(s.getDate() + 6);
    }

    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, "0");
      const dt = d.getDate().toString().padStart(2, "0");
      return `${y}-${m}-${dt}`;
    };

    const sStr = fmt(s);
    const eStr = fmt(e);

    // Check if any in preset are booked
    let hasBooked = false;
    const cur = new Date(s);
    while (cur <= e) {
      if (bookedDatesSet.has(fmt(cur))) {
        hasBooked = true;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (hasBooked) {
      // Don't apply preset if it hits a booked date
      return;
    }

    onDateChange(sStr, eStr);
    setViewYear(s.getFullYear());
    setViewMonth(s.getMonth());
    setSelectingStep("start");
  };

  // Day selection click
  const handleDateClick = (dateStr: string) => {
    if (bookedDatesSet.has(dateStr)) return; // Strictly blocked from double booking
    if (dateStr < todayStr) return; // In past

    if (selectingStep === "start" || !startDate || (startDate && endDate)) {
      // Set Start Date
      onDateChange(dateStr, dateStr);
      setSelectingStep("end");
    } else {
      // Set End Date
      if (dateStr < startDate) {
        // User clicked an earlier date, make it the new start date
        onDateChange(dateStr, dateStr);
        setSelectingStep("end");
      } else {
        // Verify no booked dates lie between startDate and this dateStr
        const cur = new Date(`${startDate}T00:00:00`);
        const endTarget = new Date(`${dateStr}T00:00:00`);
        let hasOverlap = false;

        while (cur <= endTarget) {
          const y = cur.getFullYear();
          const m = (cur.getMonth() + 1).toString().padStart(2, "0");
          const d = cur.getDate().toString().padStart(2, "0");
          if (bookedDatesSet.has(`${y}-${m}-${d}`)) {
            hasOverlap = true;
            break;
          }
          cur.setDate(cur.getDate() + 1);
        }

        if (hasOverlap) {
          // Cannot bridge across an already booked date
          onDateChange(dateStr, dateStr);
          setSelectingStep("end");
        } else {
          onDateChange(startDate, dateStr);
          setSelectingStep("start");
        }
      }
    }
  };

  // Generate calendar days for viewMonth and viewYear
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      isBooked: boolean;
      isSelectedStart: boolean;
      isSelectedEnd: boolean;
      isInRange: boolean;
    }> = [];

    // Previous month padding days
    const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const mStr = (prevM + 1).toString().padStart(2, "0");
      const dStr = d.toString().padStart(2, "0");
      const dateStr = `${prevY}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isBooked: bookedDatesSet.has(dateStr),
        isSelectedStart: false,
        isSelectedEnd: false,
        isInRange: false
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = (viewMonth + 1).toString().padStart(2, "0");
      const dStr = d.toString().padStart(2, "0");
      const dateStr = `${viewYear}-${mStr}-${dStr}`;
      const isBooked = bookedDatesSet.has(dateStr);
      const isPast = dateStr < todayStr;
      const isSelectedStart = startDate === dateStr;
      const isSelectedEnd = endDate === dateStr;
      const isInRange = Boolean(startDate && endDate && dateStr >= startDate && dateStr <= endDate);

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isPast,
        isBooked,
        isSelectedStart,
        isSelectedEnd,
        isInRange
      });
    }

    // Next month padding days to complete 35 or 42 grid slots
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const mStr = (nextM + 1).toString().padStart(2, "0");
      const dStr = d.toString().padStart(2, "0");
      const dateStr = `${nextY}-${mStr}-${dStr}`;

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr,
        isBooked: bookedDatesSet.has(dateStr),
        isSelectedStart: false,
        isSelectedEnd: false,
        isInRange: false
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, bookedDatesSet, startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        {/* Top Header: Title & Presets */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-slate-900">Dynamic Trip Calendar</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select your trip start and end dates. Dates with active bookings are blocked to prevent double-booking.
            </p>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("tomorrow")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => applyPreset("weekend")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Weekend
            </button>
            <button
              type="button"
              onClick={() => applyPreset("3days")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              3 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset("week")}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              1 Week
            </button>
          </div>
        </div>

        {/* Double-Booking Warning Alert Banner if conflict is detected */}
        {conflictDetails?.hasConflict && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Booking Conflict:</span> {conflictDetails.message}
            </div>
          </div>
        )}

        {/* Month Navigation Bar */}
        <div className="flex items-center justify-between mt-5 mb-4 px-1">
          <div className="flex items-center gap-3">
            <h4 className="text-base font-bold text-slate-900 tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h4>
            {loadingSchedule && (
              <span className="text-xs text-slate-400 animate-pulse flex items-center gap-1">
                Checking availability...
              </span>
            )}
            {bookedDatesSet.size > 0 && !loadingSchedule && (
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Ban className="w-3 h-3 text-rose-600" />
                {bookedDatesSet.size} booked slot{bookedDatesSet.size === 1 ? "" : "s"} locked
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!isCurrentMonthOrFuture()}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Weekday headers */}
          {WEEKDAYS.map((wd, i) => (
            <div 
              key={wd} 
              className={`text-xs font-semibold py-1.5 uppercase tracking-wider ${
                i === 0 || i === 6 ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {wd}
            </div>
          ))}

          {/* Day Cells */}
          {calendarDays.map((day) => {
            const isSelectable = day.isCurrentMonth && !day.isPast && !day.isBooked;
            
            // Background & Border styling
            let cellClass = "relative h-11 md:h-12 flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ";
            
            if (!day.isCurrentMonth) {
              cellClass += "text-slate-300 pointer-events-none opacity-40 ";
            } else if (day.isPast) {
              cellClass += "text-slate-300 bg-slate-50/50 cursor-not-allowed line-through ";
            } else if (day.isBooked) {
              // BOOKED / UNAVAILABLE STATE (Prevent Double-Booking)
              cellClass += "bg-rose-50 border border-rose-200 text-rose-500 cursor-not-allowed ";
            } else if (day.isSelectedStart || day.isSelectedEnd) {
              // START OR END OF SELECTED RANGE
              cellClass += "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 scale-[1.03] z-10 ";
            } else if (day.isInRange) {
              // IN-RANGE SELECTED DAYS
              cellClass += "bg-emerald-100/80 text-emerald-950 font-semibold border-y border-emerald-200 rounded-none ";
            } else {
              // AVAILABLE DAY
              cellClass += "text-slate-800 hover:bg-emerald-50 hover:border hover:border-emerald-300 cursor-pointer ";
            }

            return (
              <button
                key={day.dateStr}
                type="button"
                disabled={!isSelectable}
                onClick={() => handleDateClick(day.dateStr)}
                className={cellClass}
                title={
                  day.isBooked 
                    ? "Booked: Sitter already has an active reservation on this date. Double-booking prohibited." 
                    : day.isPast 
                    ? "Past date" 
                    : `Select ${day.dateStr}`
                }
              >
                <span className="relative z-10 leading-none">{day.dayNum}</span>

                {/* Badges / Micro Indicators */}
                {day.isBooked && (
                  <span className="text-[9px] font-bold text-rose-600 tracking-tight leading-none mt-1">
                    Booked
                  </span>
                )}

                {day.isToday && !day.isSelectedStart && !day.isSelectedEnd && !day.isBooked && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}

                {day.isSelectedStart && (
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-100 mt-0.5 leading-none">
                    Start
                  </span>
                )}

                {day.isSelectedEnd && !day.isSelectedStart && (
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-100 mt-0.5 leading-none">
                    End
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">
                ✓
              </span>
              <span>Selected Trip</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 font-bold text-[9px]">
                ✕
              </span>
              <span className="text-rose-700 font-medium">Booked (No Double-Booking)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md border border-slate-300 bg-white" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Today</span>
            </div>
          </div>

          {startDate && (
            <button
              type="button"
              onClick={() => {
                onDateChange("", "");
                setSelectingStep("start");
              }}
              className="text-xs text-slate-400 hover:text-slate-700 underline font-medium"
            >
              Reset Dates
            </button>
          )}
        </div>
      </div>

      {/* Time Selection Card ("Trip Times") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Trip Times</h3>
              <p className="text-xs text-slate-500">Specify drop-off and pick-up hours for your booking.</p>
            </div>
          </div>

          {durationSummary && (
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Duration: {durationSummary}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Start Time */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
              Start Time (Drop-off)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={startTime}
                onChange={(e) => onTimeChange(e.target.value, endTime)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={`start-${slot.value}`} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Presets for Start Time */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-slate-400 font-medium">Quick:</span>
              <button
                type="button"
                onClick={() => onTimeChange("08:00", endTime)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  startTime === "08:00" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                8:00 AM
              </button>
              <button
                type="button"
                onClick={() => onTimeChange("09:00", endTime)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  startTime === "09:00" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                9:00 AM
              </button>
              <button
                type="button"
                onClick={() => onTimeChange("12:00", endTime)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  startTime === "12:00" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                12:00 PM
              </button>
            </div>
          </div>

          {/* End Time */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <label className="block text-xs font-bold uppercase text-slate-600 tracking-wider mb-2">
              End Time (Pick-up)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={endTime}
                onChange={(e) => onTimeChange(startTime, e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={`end-${slot.value}`} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Presets for End Time */}
            <div className="flex items-center gap-1.5 mt-2.5">
              <span className="text-[11px] text-slate-400 font-medium">Quick:</span>
              <button
                type="button"
                onClick={() => onTimeChange(startTime, "17:00")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  endTime === "17:00" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                5:00 PM
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(startTime, "18:00")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  endTime === "18:00" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                6:00 PM
              </button>
              <button
                type="button"
                onClick={() => onTimeChange(startTime, "20:00")}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  endTime === "20:00" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                8:00 PM
              </button>
            </div>
          </div>
        </div>

        {/* Selected Window Summary Box */}
        {startDate && endDate && (
          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold text-slate-900">Configured Window: </span>
                <span>
                  {new Date(`${startDate}T${startTime}:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {TIME_SLOTS.find(s => s.value === startTime)?.label || startTime}
                </span>
                <span className="mx-1.5 font-bold text-slate-400">→</span>
                <span>
                  {new Date(`${endDate}T${endTime}:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {TIME_SLOTS.find(s => s.value === endTime)?.label || endTime}
                </span>
              </div>
            </div>

            {!conflictDetails?.hasConflict ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                ✓ Available (Zero Double-Booking)
              </span>
            ) : (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                ⚠️ Double-booking detected
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
