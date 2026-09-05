import { useState } from "react";
import { PERIOD_COLORS } from "./PeriodTierEditor";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOUR_LABELS = [
  "12am", "1am", "2am", "3am", "4am", "5am", "6am", "7am", "8am", "9am", "10am", "11am",
  "12pm", "1pm", "2pm", "3pm", "4pm", "5pm", "6pm", "7pm", "8pm", "9pm", "10pm", "11pm",
];

interface ScheduleGridProps {
  matrix: number[][]; // [12][24]
  onChange: (matrix: number[][]) => void;
  disabled?: boolean;
}

export function ScheduleGrid({ matrix, onChange, disabled }: ScheduleGridProps) {
  const [periodInput, setPeriodInput] = useState("0");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  function toggleCell(month: number, hour: number) {
    if (disabled) return;
    const key = `${month}-${hour}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectAll(checked);
    if (checked) {
      const all = new Set<string>();
      for (let m = 0; m < 12; m++) for (let h = 0; h < 24; h++) all.add(`${m}-${h}`);
      setSelected(all);
    } else {
      setSelected(new Set());
    }
  }

  function applySetPeriod() {
    const period = Number(periodInput) || 0;
    const next = matrix.map((row) => [...row]);
    for (const key of selected) {
      const [m, h] = key.split("-").map(Number);
      next[m][h] = period;
    }
    onChange(next);
  }

  return (
    <div>
      <div className="schedule-toolbar">
        <label>Period:</label>
        <input
          className="period-mini-input"
          value={periodInput}
          onChange={(e) => setPeriodInput(e.target.value)}
          disabled={disabled}
        />
        <button type="button" className="btn-secondary" onClick={applySetPeriod} disabled={disabled || selected.size === 0}>
          Set Period
        </button>
        <label className="radio-label">
          <input type="checkbox" checked={selectAll} onChange={(e) => toggleSelectAll(e.target.checked)} disabled={disabled} />
          Click to Select All
        </label>
      </div>

      <div className="schedule-grid-wrap">
        <table className="schedule-grid">
          <thead>
            <tr>
              <th></th>
              {HOUR_LABELS.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTH_LABELS.map((month, m) => (
              <tr key={month}>
                <th>{month}</th>
                {HOUR_LABELS.map((_, h) => {
                  const period = matrix[m]?.[h] ?? 0;
                  const key = `${m}-${h}`;
                  const isSelected = selected.has(key);
                  return (
                    <td key={h}>
                      <button
                        type="button"
                        className={`schedule-cell${isSelected ? " selected" : ""}`}
                        style={{ background: period > 0 ? PERIOD_COLORS[period % PERIOD_COLORS.length] : undefined }}
                        onClick={() => toggleCell(m, h)}
                        disabled={disabled}
                      >
                        {period}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
