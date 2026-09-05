export const PERIOD_COLORS = ["#f5a623", "#4a90d9", "#7ed321", "#bd10e0", "#d0021b", "#50e3c2", "#9013fe", "#8b8b8b"];

export interface Tier {
  max: string;
  unit?: string;
  rate: string;
  adj: string;
  sell?: string;
}

export interface Period {
  tiers: Tier[];
}

export const EMPTY_TIER: Tier = { max: "", unit: undefined, rate: "", adj: "", sell: undefined };

export function newPeriod(withUnit?: string, withSell?: boolean): Period {
  return { tiers: [{ max: "", unit: withUnit, rate: "", adj: "", sell: withSell ? "" : undefined }] };
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface PeriodTierEditorProps {
  periods: Period[];
  onChange: (periods: Period[]) => void;
  maxUsageLabel: string;
  unitOptions?: string[];
  showSellColumn?: boolean;
  showMonthColumns?: boolean;
  monthAssignment?: number[];
  onMonthAssignmentChange?: (assignment: number[]) => void;
  disabled?: boolean;
}

export function PeriodTierEditor({
  periods,
  onChange,
  maxUsageLabel,
  unitOptions,
  showSellColumn,
  showMonthColumns,
  monthAssignment,
  onMonthAssignmentChange,
  disabled,
}: PeriodTierEditorProps) {
  function updateTier(periodIdx: number, tierIdx: number, field: keyof Tier, value: string) {
    onChange(
      periods.map((p, pi) =>
        pi !== periodIdx ? p : { ...p, tiers: p.tiers.map((t, ti) => (ti !== tierIdx ? t : { ...t, [field]: value })) }
      )
    );
  }

  function addTier(periodIdx: number) {
    onChange(
      periods.map((p, pi) =>
        pi !== periodIdx
          ? p
          : { ...p, tiers: [...p.tiers, { max: "", unit: unitOptions?.[0], rate: "", adj: "", sell: showSellColumn ? "" : undefined }] }
      )
    );
  }

  function deleteTier(periodIdx: number) {
    onChange(periods.map((p, pi) => (pi !== periodIdx ? p : { ...p, tiers: p.tiers.slice(0, -1) })));
  }

  function addPeriod() {
    onChange([...periods, newPeriod(unitOptions?.[0], showSellColumn)]);
  }

  function deletePeriod(periodIdx: number) {
    onChange(periods.filter((_, pi) => pi !== periodIdx));
    if (showMonthColumns && monthAssignment && onMonthAssignmentChange) {
      onMonthAssignmentChange(monthAssignment.map((p) => (p === periodIdx ? 0 : p > periodIdx ? p - 1 : p)));
    }
  }

  return (
    <div>
      {periods.map((period, periodIdx) => (
        <div key={periodIdx} className="period-block">
          <table className="tier-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Tier</th>
                <th>{maxUsageLabel}</th>
                {unitOptions && <th>Max Usage Units</th>}
                <th>Rate</th>
                <th>Adjustments</th>
                {showSellColumn && <th>Sell</th>}
                {showMonthColumns &&
                  MONTH_LABELS.map((m) => (
                    <th key={m} className="month-col">
                      {m}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {period.tiers.map((tier, tierIdx) => (
                <tr key={tierIdx}>
                  {tierIdx === 0 && (
                    <td rowSpan={period.tiers.length}>
                      <span className="period-swatch" style={{ background: PERIOD_COLORS[periodIdx % PERIOD_COLORS.length] }} />
                      {periodIdx}
                    </td>
                  )}
                  <td>{tierIdx}</td>
                  <td>
                    <input
                      value={tier.max}
                      disabled={disabled}
                      onChange={(e) => updateTier(periodIdx, tierIdx, "max", e.target.value)}
                    />
                  </td>
                  {unitOptions && (
                    <td>
                      <select
                        value={tier.unit ?? unitOptions[0]}
                        disabled={disabled}
                        onChange={(e) => updateTier(periodIdx, tierIdx, "unit", e.target.value)}
                      >
                        {unitOptions.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                  <td>
                    <input
                      value={tier.rate}
                      disabled={disabled}
                      onChange={(e) => updateTier(periodIdx, tierIdx, "rate", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      value={tier.adj}
                      disabled={disabled}
                      onChange={(e) => updateTier(periodIdx, tierIdx, "adj", e.target.value)}
                    />
                  </td>
                  {showSellColumn && (
                    <td>
                      <input
                        value={tier.sell ?? ""}
                        disabled={disabled}
                        onChange={(e) => updateTier(periodIdx, tierIdx, "sell", e.target.value)}
                      />
                    </td>
                  )}
                  {showMonthColumns &&
                    tierIdx === 0 &&
                    MONTH_LABELS.map((_, monthIdx) => (
                      <td key={monthIdx} rowSpan={period.tiers.length} className="month-col">
                        <input
                          type="radio"
                          name={`month-${monthIdx}`}
                          disabled={disabled}
                          checked={(monthAssignment?.[monthIdx] ?? 0) === periodIdx}
                          onChange={() => {
                            if (!monthAssignment || !onMonthAssignmentChange) return;
                            const next = [...monthAssignment];
                            next[monthIdx] = periodIdx;
                            onMonthAssignmentChange(next);
                          }}
                        />
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!disabled && (
            <div className="period-actions">
              <button type="button" className="btn-danger-outline" onClick={() => deletePeriod(periodIdx)}>
                – Delete Period
              </button>
              <button type="button" className="btn-danger-outline" onClick={() => deleteTier(periodIdx)} disabled={period.tiers.length <= 1}>
                – Delete Tier
              </button>
              <button type="button" className="btn-outline-primary" onClick={() => addTier(periodIdx)}>
                + Add Tier
              </button>
            </div>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="btn-outline-success" onClick={addPeriod}>
          + Add Period
        </button>
      )}
    </div>
  );
}
