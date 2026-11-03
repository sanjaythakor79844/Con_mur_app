import { useState, useEffect } from "react";
import { LivIcon } from "./liv";

// Visit types configuration matching the provided code
const VISIT_TYPES = {
  pod: {
    title: "Pod re-measure",
    who: "Aaha pod, with a nurse",
    min: 30,
    where: "centre" as const,
    why: "Grip, body composition and vitals, read straight into your record.",
    due: "Due · Day 42",
  },
  doc: {
    title: "Physician review",
    who: "Dr. A. Deshmukh",
    min: 20,
    where: "either" as const,
    why: "Walk through your markers together. She signs off every change to your plan.",
  },
  coach: {
    title: "Coach session",
    who: "Ritu S., longevity coach",
    min: 30,
    where: "video" as const,
    why: "Strength, sleep and the fortnight ahead.",
  },
  thx: {
    title: "Nutrition session",
    who: "Centre dietitian",
    min: 30,
    where: "either" as const,
    why: "A protein- and iron-rich plan for a vegetarian kitchen.",
  },
  ther: {
    title: "Therapy session",
    who: "Recovery suite",
    min: 45,
    where: "centre" as const,
    why: "Sauna, light, HBOT or a drip, from your care package.",
  },
};

const WHERE_LABELS = {
  centre: "At the centre",
  video: "Video call",
  either: "Centre or video",
};

const SLOTS = ["9:00 AM", "10:30 AM", "12:00 PM", "4:00 PM", "5:30 PM", "6:30 PM"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Slot availability logic from the provided code
function slotFree(dayIndex: number, slotIndex: number): boolean {
  return (dayIndex * 7 + slotIndex * 3) % 5 !== 0;
}

// Add minutes to time string (e.g., "9:00 AM" + 30 = "9:30 AM")
function addMinutes(timeStr: string, minutes: number): string {
  const parts = timeStr.split(/[: ]/);
  let hours = parseInt(parts[0]) % 12 + (parts[2] === "PM" ? 12 : 0);
  let mins = parseInt(parts[1]) + minutes;
  hours += Math.floor(mins / 60);
  mins %= 60;
  const h = hours % 12 || 12;
  const m = mins < 10 ? "0" + mins : mins;
  const period = hours >= 12 ? "PM" : "AM";
  return `${h}:${m} ${period}`;
}

interface BookedVisit {
  key: string;
  title: string;
  who: string;
  min: number;
  time: string;
  date: Date;
}

interface BookVisitProps {
  initialType?: string | null;
  replaceAppointmentId?: string | number | null;
  onBack: () => void;
  onConfirm: (visits: BookedVisit[]) => void;
}

export function BookVisit({ initialType, replaceAppointmentId, onBack, onConfirm }: BookVisitProps) {
  const [selectedType, setSelectedType] = useState<string | null>(initialType || null);
  const [pairedTypes, setPairedTypes] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Generate next 7 days
  const bookingDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return date;
  });

  // Calculate current step
  const step = !selectedType ? 1 : selectedDay == null || selectedSlot == null ? 2 : 3;
  const ready = selectedType && selectedDay != null && selectedSlot != null;

  // Get selected visit config
  const mainVisit = selectedType ? VISIT_TYPES[selectedType as keyof typeof VISIT_TYPES] : null;

  // Check if a type can be paired
  const canPair = (key: string): boolean => {
    if (!selectedType || key === selectedType) return false;
    const main = VISIT_TYPES[selectedType as keyof typeof VISIT_TYPES];
    const other = VISIT_TYPES[key as keyof typeof VISIT_TYPES];
    return main.where !== "video" && other.where !== "video";
  };

  // Toggle paired type
  const togglePaired = (key: string) => {
    setPairedTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Build visit plan with calculated times
  const buildPlan = (): BookedVisit[] => {
    if (!selectedType || selectedDay == null || !selectedSlot) return [];

    const visits: BookedVisit[] = [];
    const allTypes = [selectedType, ...pairedTypes];
    let currentTime = selectedSlot;

    allTypes.forEach((key) => {
      const config = VISIT_TYPES[key as keyof typeof VISIT_TYPES];
      visits.push({
        key,
        title: config.title,
        who: config.who,
        min: config.min,
        time: currentTime,
        date: bookingDays[selectedDay],
      });
      currentTime = addMinutes(currentTime, config.min);
    });

    return visits;
  };

  const plan = buildPlan();
  const totalMinutes = plan.reduce((sum, v) => sum + v.min, 0);

  // Format date for display
  const formatDate = (date: Date) => {
    return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  };

  // Step titles and subtitles
  const stepInfo = {
    1: {
      title: "Who would you like to see?",
      subtitle: "Choose one. Centre visits can be paired into a single trip.",
    },
    2: {
      title: "When suits you?",
      subtitle: "Every slot shown is open right now. Pick a day, then a time.",
    },
    3: {
      title: "Ready when you are.",
      subtitle: "Liv reminds you the day before.",
    },
  };

  return (
    <div className="scroll">
      {/* Header with back button and step indicator */}
      <div className="hd">
        <button type="button" className="icb" onClick={onBack} aria-label="Back">
          <LivIcon name="back" size={20} />
        </button>
        <span className="stp">
          {[1, 2, 3].map((i) => (
            <i key={i} className={i <= step ? "on" : ""} />
          ))}
        </span>
        <span style={{ width: "44px" }} />
      </div>

      {/* Title and subtitle */}
      <div>
        <span className="k">Book a visit · step {step} of 3</span>
        <h1 className="h1" style={{ marginTop: "8px" }}>
          {stepInfo[step as 1 | 2 | 3].title}
        </h1>
        <p className="sub" style={{ marginTop: "8px" }}>
          {stepInfo[step as 1 | 2 | 3].subtitle}
        </p>
      </div>

      {/* Visit type selection */}
      <div className="vts">
        {Object.entries(VISIT_TYPES).map(([key, config]) => {
          const isSelected = selectedType === key;
          const isPaired = pairedTypes.includes(key);
          const pairable = canPair(key);

          return (
            <button
              key={key}
              type="button"
              className={`vt${isSelected ? " on" : ""}${isPaired ? " pair" : ""}`}
              onClick={() => {
                if (isSelected || !selectedType || !pairable) {
                  // Select this type
                  setSelectedType(key);
                  setPairedTypes([]);
                } else if (pairable) {
                  // Toggle pairing
                  togglePaired(key);
                }
              }}
              aria-pressed={isSelected || isPaired}
            >
              <span className="vt-ico">
                {isSelected ? (
                  <LivIcon name="check" size={16} strokeWidth={2.4} />
                ) : isPaired ? (
                  <b>+</b>
                ) : (
                  <i />
                )}
              </span>
              <span className="vt-t">
                <span className="vt-h">
                  <b>{config.title}</b>
                  {config.due && <span className="pill p" style={{ height: "20px", fontSize: "9.5px" }}>{config.due}</span>}
                </span>
                <small>
                  {config.who} · {config.min} min · {WHERE_LABELS[config.where]}
                </small>
                {(isSelected || !selectedType) && <span className="vt-why">{config.why}</span>}
              </span>
              {isPaired ? (
                <span className="k" style={{ fontSize: "9.5px" }}>
                  Paired
                </span>
              ) : pairable ? (
                <span className="k" style={{ fontSize: "9.5px", color: "var(--faint)" }}>
                  + Pair
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Day picker */}
      {selectedType && (
        <>
          <span className="k" style={{ marginTop: "10px" }}>
            When suits you · {MONTHS[bookingDays[0].getMonth()]}
            {bookingDays[6].getMonth() !== bookingDays[0].getMonth()
              ? ` to ${MONTHS[bookingDays[6].getMonth()]}`
              : ""}
          </span>
          <div className="chips dayz">
            {bookingDays.map((date, i) => (
              <button
                key={i}
                type="button"
                className={`chip day${selectedDay === i ? " on" : ""}`}
                onClick={() => setSelectedDay(i)}
                aria-pressed={selectedDay === i}
              >
                <small>{DAYS[date.getDay()]}</small>
                <b>{date.getDate()}</b>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Time slot picker */}
      {selectedType && selectedDay != null && (
        <>
          {[
            ["Morning", [0, 1]],
            ["Midday", [2]],
            ["Evening", [3, 4, 5]],
          ].map(([label, indices]) => (
            <div key={label as string} className="tgrp">
              <span className="k" style={{ fontSize: "9.5px", color: "var(--faint)" }}>
                {label}
              </span>
              <div className="slots" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {(indices as number[]).map((slotIndex) => {
                  const slot = SLOTS[slotIndex];
                  const free = slotFree(selectedDay, slotIndex);
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`chip${selectedSlot === slot ? " on" : ""}`}
                      onClick={() => setSelectedSlot(slot)}
                      disabled={!free}
                      aria-pressed={selectedSlot === slot}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Summary card */}
      {ready && (
        <div className="card inv" style={{ gap: "16px", marginTop: "24px", padding: "24px" }}>
          <div className="hd">
            <span className="k" style={{ color: "var(--inv-muted)" }}>
              Your visit
            </span>
            <span className="k" style={{ color: "var(--inv-muted)" }}>
              {formatDate(bookingDays[selectedDay!])}
            </span>
          </div>
          {plan.map((visit) => (
            <div key={visit.key} className="vsum" style={{ gap: "14px", padding: "12px 0" }}>
              <span className="unit" style={{ color: "var(--inv-muted)", width: "72px", fontSize: "13px" }}>
                {visit.time}
              </span>
              <span style={{ flex: 1, lineHeight: "1.5" }}>
                <b style={{ fontSize: "15px" }}>{visit.title}</b>
                <br />
                <span className="sub" style={{ color: "var(--inv-muted)", marginTop: "4px", display: "inline-block" }}>
                  {visit.who}
                </span>
              </span>
              <span className="unit" style={{ color: "var(--inv-muted)", fontSize: "13px" }}>
                {visit.min} min
              </span>
            </div>
          ))}
          <span
            className="sub"
            style={{
              color: "var(--inv-muted)",
              paddingTop: "16px",
              marginTop: "8px",
              borderTop: "1px solid var(--inv-line)",
              lineHeight: "1.6",
            }}
          >
            About {totalMinutes} minutes
            {mainVisit?.where === "video" ? ", from wherever you are" : " at the centre, Aundh"}. Free to
            move or cancel up to 12 hours before.
          </span>
        </div>
      )}

      <div style={{ flex: 1, minHeight: "24px" }} />

      {/* Confirm button */}
      <button
        type="button"
        className="btn"
        disabled={!ready}
        onClick={() => {
          if (ready) {
            onConfirm(plan);
          }
        }}
      >
        {ready
          ? `Confirm · ${formatDate(bookingDays[selectedDay!])}, ${selectedSlot}`
          : !selectedType
          ? "Choose who you'd like to see"
          : selectedDay == null
          ? "Pick a day"
          : "Pick a time"}
      </button>
    </div>
  );
}
