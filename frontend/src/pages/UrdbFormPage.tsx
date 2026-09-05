import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { CustomAttribute, Lookup, UrdbRate, UrdbRevision } from "../api/types";
import { US_STATES } from "../constants/usStates";
import { PlusIcon, TrashIcon } from "../components/icons";
import { PeriodTierEditor, newPeriod, type Period } from "../components/PeriodTierEditor";
import { ScheduleGrid } from "../components/ScheduleGrid";
import {
  DEMAND_UNIT_OPTIONS,
  ENERGY_UNIT_OPTIONS,
  ZERO_SCHEDULE,
  parseMonthAssignment,
  parseMonthlyValues,
  parseTierStructure,
  serializeMonthAssignment,
  serializeMonthlyValues,
  serializeTierStructure,
} from "../utils/rateStructure";

const TABS = ["Basic Information", "Demand", "Energy", "Fixed Charges", "Other Attributes"] as const;
type Tab = (typeof TABS)[number];

type AttrGroup = "demand" | "energy" | "fixed";

const ATTRIBUTE_GROUPS: { value: AttrGroup; label: string }[] = [
  { value: "demand", label: "Other Demand Attributes" },
  { value: "energy", label: "Other Energy Attributes" },
  { value: "fixed", label: "Other Fixed Charge Attributes" },
];

// Reference catalog of common URDB attribute names shown in the "Available
// Other Attributes" dropdown — the original pulled these from an admin-
// managed master list; hardcoded here as a starter set.
const AVAILABLE_ATTRIBUTES: Record<AttrGroup, string[]> = {
  demand: ["Ratchet Percentage", "Reactive Power Charge", "Demand Window (minutes)"],
  energy: ["Fuel Adjustment", "Sell Rate", "Time-of-Use Credit"],
  fixed: ["Grid Access Charge", "Customer Charge", "Meter Charge"],
};

const EMPTY_ATTR: CustomAttribute = { attribute: "", value: "" };
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function useLookup(category: string) {
  const [rows, setRows] = useState<Lookup[]>([]);
  useEffect(() => {
    api.get<Lookup[]>(`/lookups/${category}`).then(setRows);
  }, [category]);
  return rows;
}

export function UrdbFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get("mode") === "view";
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const sectors = useLookup("sector");
  const serviceTypes = useLookup("service_type");
  const voltageCategories = useLookup("voltage_category");
  const phaseWires = useLookup("phase_wire");
  const [utilities, setUtilities] = useState<string[]>([]);

  const [tabIndex, setTabIndex] = useState(() => {
    const requested = searchParams.get("tab");
    if (requested === "other-attributes") return TABS.indexOf("Other Attributes");
    if (requested === "demand") return TABS.indexOf("Demand");
    if (requested === "energy") return TABS.indexOf("Energy");
    if (requested === "fixed-charges") return TABS.indexOf("Fixed Charges");
    return 0;
  });
  const tab: Tab = TABS[tabIndex];

  // Basic Information
  const [state, setState] = useState("");
  const [utility, setUtility] = useState("");
  const [sector, setSector] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [supersedesLabel, setSupersedesLabel] = useState("");
  const [serviceType, setServiceType] = useState("bundled");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [sourceParent, setSourceParent] = useState("");
  const [compensation, setCompensation] = useState("");
  const [assumeNetMetering, setAssumeNetMetering] = useState(false);
  const [basicComments, setBasicComments] = useState("");

  // Applicability
  const [demandAppMin, setDemandAppMin] = useState("");
  const [demandAppMax, setDemandAppMax] = useState("");
  const [demandAppUnit, setDemandAppUnit] = useState("kW");
  const [demandAppHistory, setDemandAppHistory] = useState("");
  const [energyAppMin, setEnergyAppMin] = useState("");
  const [energyAppMax, setEnergyAppMax] = useState("");
  const [energyAppHistory, setEnergyAppHistory] = useState("");
  const [voltageMin, setVoltageMin] = useState("");
  const [voltageMax, setVoltageMax] = useState("");
  const [voltageCategory, setVoltageCategory] = useState("primary");
  const [phaseWiring, setPhaseWiring] = useState("1_2");

  // Demand tab — Seasonal/Monthly (flat), Time of Use, Coincident
  const [flatDemandUnit, setFlatDemandUnit] = useState("kW");
  const [flatDemandPeriods, setFlatDemandPeriods] = useState<Period[]>([newPeriod()]);
  const [flatDemandMonths, setFlatDemandMonths] = useState<number[]>(Array(12).fill(0));
  const [touDemandUnit, setTouDemandUnit] = useState("kW");
  const [touDemandPeriods, setTouDemandPeriods] = useState<Period[]>([newPeriod()]);
  const [demandWeekdaySchedule, setDemandWeekdaySchedule] = useState<number[][]>(ZERO_SCHEDULE);
  const [demandWeekendSchedule, setDemandWeekendSchedule] = useState<number[][]>(ZERO_SCHEDULE);
  const [demandRatchet, setDemandRatchet] = useState<string[]>(Array(12).fill(""));
  const [coincidentUnit, setCoincidentUnit] = useState("kW");
  const [coincidentPeriods, setCoincidentPeriods] = useState<Period[]>([newPeriod()]);
  const [coincidentSchedule, setCoincidentSchedule] = useState<number[][]>(ZERO_SCHEDULE);
  const [demandComments, setDemandComments] = useState("");
  const [hasCoincident, setHasCoincident] = useState(false);

  // Energy tab
  const [energyPeriods, setEnergyPeriods] = useState<Period[]>([newPeriod("kWh", true)]);
  const [energyWeekdaySchedule, setEnergyWeekdaySchedule] = useState<number[][]>(ZERO_SCHEDULE);
  const [energyWeekendSchedule, setEnergyWeekendSchedule] = useState<number[][]>(ZERO_SCHEDULE);
  const [fuelAdjustments, setFuelAdjustments] = useState<string[]>(Array(12).fill(""));
  const [energyComments, setEnergyComments] = useState("");

  // Fixed Charges tab
  const [fixedDailyCharge, setFixedDailyCharge] = useState(0);
  const [fixedMonthlyCharge, setFixedMonthlyCharge] = useState(0);
  const [minMonthlyCharge, setMinMonthlyCharge] = useState(0);
  const [annualMinCharge, setAnnualMinCharge] = useState(0);

  // Other Attributes tab
  const [attributeGroup, setAttributeGroup] = useState<AttrGroup>("demand");
  const [availableAttribute, setAvailableAttribute] = useState("");
  const [demandAttrs, setDemandAttrs] = useState<CustomAttribute[]>([{ ...EMPTY_ATTR }]);
  const [energyAttrs, setEnergyAttrs] = useState<CustomAttribute[]>([{ ...EMPTY_ATTR }]);
  const [fixedAttrs, setFixedAttrs] = useState<CustomAttribute[]>([{ ...EMPTY_ATTR }]);
  const [revisions, setRevisions] = useState<UrdbRevision[]>([]);

  const attrState: Record<AttrGroup, [CustomAttribute[], (v: CustomAttribute[]) => void]> = {
    demand: [demandAttrs, setDemandAttrs],
    energy: [energyAttrs, setEnergyAttrs],
    fixed: [fixedAttrs, setFixedAttrs],
  };

  function addAttributeRow(group: AttrGroup, attribute = "") {
    const [rows, setRows] = attrState[group];
    setRows([...rows, { attribute, value: "" }]);
  }
  function updateAttributeRow(group: AttrGroup, index: number, field: keyof CustomAttribute, value: string) {
    const [rows, setRows] = attrState[group];
    setRows(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }
  function deleteAttributeRow(group: AttrGroup, index: number) {
    const [rows, setRows] = attrState[group];
    setRows(rows.filter((_, i) => i !== index));
  }
  function handleAddFromSelector() {
    addAttributeRow(attributeGroup, availableAttribute);
    setAvailableAttribute("");
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = state ? `?state=${encodeURIComponent(state)}` : "";
    api.get<string[]>(`/urdb-rates/filters/utilities${q}`).then(setUtilities);
  }, [state]);

  useEffect(() => {
    if (!id) return;
    api.get<UrdbRate>(`/urdb-rates/${id}`).then((rate) => {
      const rd = rate.rateData;

      setState(rate.state ?? "");
      setUtility(rate.utility);
      setSector(rate.sector);
      setName(rate.name);
      setStartDate(rate.startDate.slice(0, 10));
      setEndDate(rate.endDate ? rate.endDate.slice(0, 10) : "");
      setSupersedesLabel(rate.supersedesLabel ?? "");
      setServiceType(rate.serviceType ?? "bundled");
      setDescription(rate.description ?? "");
      setSource(rate.source ?? "");
      setSourceParent(rate.sourceParent ?? "");
      setCompensation(rate.compensationForDistributionGeneration ?? "");
      setAssumeNetMetering(rate.assumeNetMetering);
      setBasicComments(rate.basicComments ?? "");
      setDemandAppMin(rate.demandApplicabilityMin?.toString() ?? "");
      setDemandAppMax(rate.demandApplicabilityMax?.toString() ?? "");
      setDemandAppUnit(rate.demandApplicabilityUnit);
      setDemandAppHistory(rate.demandApplicabilityHistoryMonths?.toString() ?? "");
      setEnergyAppMin(rate.energyApplicabilityMin?.toString() ?? "");
      setEnergyAppMax(rate.energyApplicabilityMax?.toString() ?? "");
      setEnergyAppHistory(rate.energyApplicabilityHistoryMonths?.toString() ?? "");
      setVoltageMin(rate.serviceVoltageMin?.toString() ?? "");
      setVoltageMax(rate.serviceVoltageMax?.toString() ?? "");
      setVoltageCategory(rate.voltageCategory ?? "primary");
      setPhaseWiring(rate.phaseWiring ?? "1_2");
      setFixedDailyCharge(rate.fixedDailyCharge);
      setFixedMonthlyCharge(rate.fixedMonthlyCharge);
      setMinMonthlyCharge(rate.minMonthlyCharge);
      setAnnualMinCharge(rate.annualMinCharge);

      setFlatDemandUnit(rd.flatdemandunit || "kW");
      setFlatDemandPeriods(parseTierStructure(rd.flatdemandstructure, "flatdemandstructure", false, false));
      setFlatDemandMonths(parseMonthAssignment(rd.flatdemandmonths));
      setTouDemandUnit(rd.demandrateunit || "kW");
      setTouDemandPeriods(parseTierStructure(rd.demandratestructure, "demandratestructure", false, false));
      setDemandWeekdaySchedule(rd.demandweekdayschedule ?? ZERO_SCHEDULE);
      setDemandWeekendSchedule(rd.demandweekendschedule ?? ZERO_SCHEDULE);
      setDemandRatchet(parseMonthlyValues(rd.demandratchetpercentage));
      setDemandComments(rd.demandcomments ?? "");
      setHasCoincident(Boolean(rd.coincidentratestructure));
      setCoincidentUnit(rd.coincidentrateunit || "kW");
      setCoincidentPeriods(parseTierStructure(rd.coincidentratestructure, "coincidentratestructure", false, false));
      setCoincidentSchedule(rd.coincidentrateschedule ?? ZERO_SCHEDULE);

      setEnergyPeriods(parseTierStructure(rd.energyratestructure, "energyratestructure", true, true, "kWh"));
      setEnergyWeekdaySchedule(rd.energyweekdayschedule ?? ZERO_SCHEDULE);
      setEnergyWeekendSchedule(rd.energyweekendschedule ?? ZERO_SCHEDULE);
      setFuelAdjustments(parseMonthlyValues(rd.energyfueladjustments));
      setEnergyComments(rd.energycomments ?? "");

      if (rd.demandattrs?.length) setDemandAttrs(rd.demandattrs);
      if (rd.energyattrs?.length) setEnergyAttrs(rd.energyattrs);
      if (rd.fixedattrs?.length) setFixedAttrs(rd.fixedattrs);
    });
    api.get<UrdbRevision[]>(`/urdb-rates/${id}/revisions`).then(setRevisions);
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const num = (v: string) => (v === "" ? null : Number(v));
    const nonEmpty = (rows: CustomAttribute[]) => rows.filter((r) => r.attribute.trim() !== "");
    const hasFlatDemand = flatDemandPeriods.some((p) => p.tiers.some((t) => t.rate !== ""));
    const hasTouDemand = touDemandPeriods.some((p) => p.tiers.some((t) => t.rate !== ""));

    const rateData = {
      energyratestructure: serializeTierStructure(energyPeriods, "energyratestructure", true, true, "kWh"),
      energyweekdayschedule: energyWeekdaySchedule,
      energyweekendschedule: energyWeekendSchedule,
      energyfueladjustments: serializeMonthlyValues(fuelAdjustments),
      energycomments: energyComments || undefined,

      ...(hasFlatDemand
        ? {
            flatdemandunit: flatDemandUnit,
            flatdemandstructure: serializeTierStructure(flatDemandPeriods, "flatdemandstructure", false, false, flatDemandUnit),
            flatdemandmonths: serializeMonthAssignment(flatDemandMonths),
          }
        : {}),
      ...(hasTouDemand
        ? {
            demandrateunit: touDemandUnit,
            demandratestructure: serializeTierStructure(touDemandPeriods, "demandratestructure", false, false, touDemandUnit),
            demandweekdayschedule: demandWeekdaySchedule,
            demandweekendschedule: demandWeekendSchedule,
          }
        : {}),
      demandratchetpercentage: serializeMonthlyValues(demandRatchet),
      demandcomments: demandComments || undefined,

      ...(hasCoincident
        ? {
            coincidentrateunit: coincidentUnit,
            coincidentratestructure: serializeTierStructure(coincidentPeriods, "coincidentratestructure", false, false, coincidentUnit),
            coincidentrateschedule: coincidentSchedule,
          }
        : {}),

      demandattrs: nonEmpty(demandAttrs),
      energyattrs: nonEmpty(energyAttrs),
      fixedattrs: nonEmpty(fixedAttrs),
    };

    const payload = {
      state: state || undefined,
      utility,
      sector,
      name,
      startDate,
      endDate: endDate || null,
      supersedesLabel: supersedesLabel || undefined,
      serviceType,
      description: description || undefined,
      source: source || undefined,
      sourceParent: sourceParent || undefined,
      compensationForDistributionGeneration: compensation || undefined,
      assumeNetMetering,
      basicComments: basicComments || undefined,
      demandApplicabilityMin: num(demandAppMin),
      demandApplicabilityMax: num(demandAppMax),
      demandApplicabilityUnit: demandAppUnit,
      demandApplicabilityHistoryMonths: num(demandAppHistory),
      energyApplicabilityMin: num(energyAppMin),
      energyApplicabilityMax: num(energyAppMax),
      energyApplicabilityHistoryMonths: num(energyAppHistory),
      serviceVoltageMin: num(voltageMin),
      serviceVoltageMax: num(voltageMax),
      voltageCategory,
      phaseWiring,
      fixedDailyCharge: Number(fixedDailyCharge),
      fixedMonthlyCharge: Number(fixedMonthlyCharge),
      minMonthlyCharge: Number(minMonthlyCharge),
      annualMinCharge: Number(annualMinCharge),
      rateData,
    };

    try {
      if (isEdit) {
        await api.put(`/urdb-rates/${id}`, payload);
      } else {
        await api.post(`/urdb-rates`, payload);
      }
      navigate("/urdb-rates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const disabled = viewOnly;
  const isLastStep = tabIndex === TABS.length - 1;

  function StepToolbar() {
    return (
      <div className="urdb-form-toolbar">
        <button type="button" className="btn-secondary" onClick={() => navigate("/urdb-rates")}>
          Cancel
        </button>
        <div className="row-actions">
          {tabIndex > 0 && (
            <button type="button" className="btn-secondary" onClick={() => setTabIndex((i) => i - 1)}>
              ← Back
            </button>
          )}
          {!isLastStep && (
            <button type="button" className="btn-secondary" onClick={() => setTabIndex((i) => i + 1)}>
              Next →
            </button>
          )}
          {isLastStep && !disabled && (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save" : "Add"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="urdb-card" style={{ maxWidth: 1200 }}>
        <div className="urdb-card-header">
          <span>{viewOnly ? "View Utility Rate" : isEdit ? "Edit Utility Rate" : "Add Utility Rate"}</span>
        </div>

        <div className="urdb-tabbar">
          {TABS.map((t, i) => (
            <button key={t} type="button" className={`urdb-tab${tabIndex === i ? " active" : ""}`} onClick={() => setTabIndex(i)}>
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <StepToolbar />

          <fieldset disabled={disabled} className="urdb-form-body">
            {tab === "Basic Information" && (
              <>
                <h3 className="urdb-section-title">Basic Information</h3>
                <div className="urdb-field-grid">
                  <label>State :</label>
                  <select value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="">Select</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <label>Utility Name :</label>
                  <div>
                    <input list="utility-options" value={utility} onChange={(e) => setUtility(e.target.value)} required />
                    <datalist id="utility-options">
                      {utilities.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>

                  <label>Sector :</label>
                  <select value={sector} onChange={(e) => setSector(e.target.value)} required>
                    <option value="">Select</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <label>Rate Name :</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required />

                  <label>Effective Date :</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />

                  <label>End Date :</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

                  <label>Label of the rate this rate supercedes :</label>
                  <input value={supersedesLabel} onChange={(e) => setSupersedesLabel(e.target.value)} />

                  <label>Service Type :</label>
                  <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    {serviceTypes.map((s) => (
                      <option key={s.id} value={s.code}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  <label>Description :</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} />

                  <label>Source or reference :</label>
                  <input value={source} onChange={(e) => setSource(e.target.value)} />

                  <label>Source Parent :</label>
                  <input value={sourceParent} onChange={(e) => setSourceParent(e.target.value)} />

                  <label>Compensation for distribution generation :</label>
                  <input value={compensation} onChange={(e) => setCompensation(e.target.value)} />

                  <label>Assume net metering (buy=sell) :</label>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={assumeNetMetering}
                    onChange={(e) => setAssumeNetMetering(e.target.checked)}
                  />

                  <label>Basic Comments :</label>
                  <input value={basicComments} onChange={(e) => setBasicComments(e.target.value)} />
                </div>

                <h3 className="urdb-section-title">Applicability</h3>

                <div className="urdb-subsection-label">Demand</div>
                <div className="urdb-field-grid">
                  <label>Minimum (kW) :</label>
                  <input type="number" value={demandAppMin} onChange={(e) => setDemandAppMin(e.target.value)} />
                  <label>Maximum (kW) :</label>
                  <input type="number" value={demandAppMax} onChange={(e) => setDemandAppMax(e.target.value)} />
                  <label>Demand Units :</label>
                  <select value={demandAppUnit} onChange={(e) => setDemandAppUnit(e.target.value)}>
                    <option value="kW">kW</option>
                    <option value="kVA">kVA</option>
                    <option value="hp">hp</option>
                  </select>
                  <label>History (months) :</label>
                  <input type="number" value={demandAppHistory} onChange={(e) => setDemandAppHistory(e.target.value)} />
                </div>

                <div className="urdb-subsection-label">Energy</div>
                <div className="urdb-field-grid">
                  <label>Minimum (kWh) :</label>
                  <input type="number" value={energyAppMin} onChange={(e) => setEnergyAppMin(e.target.value)} />
                  <label>Maximum (kWh) :</label>
                  <input type="number" value={energyAppMax} onChange={(e) => setEnergyAppMax(e.target.value)} />
                  <label>History (months) :</label>
                  <input type="number" value={energyAppHistory} onChange={(e) => setEnergyAppHistory(e.target.value)} />
                </div>

                <div className="urdb-subsection-label">Service Voltage</div>
                <div className="urdb-field-grid">
                  <label>Minimum (v) :</label>
                  <input type="number" value={voltageMin} onChange={(e) => setVoltageMin(e.target.value)} />
                  <label>Maximum (v) :</label>
                  <input type="number" value={voltageMax} onChange={(e) => setVoltageMax(e.target.value)} />
                </div>

                <div className="urdb-subsection-label">Character of Service</div>
                <div className="urdb-field-grid">
                  <label>Voltage category :</label>
                  <select value={voltageCategory} onChange={(e) => setVoltageCategory(e.target.value)}>
                    {voltageCategories.map((v) => (
                      <option key={v.id} value={v.code}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <label>Phase wiring :</label>
                  <select value={phaseWiring} onChange={(e) => setPhaseWiring(e.target.value)}>
                    {phaseWires.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {tab === "Demand" && (
              <>
                <h3 className="urdb-section-title">Seasonal/Monthly Demand Charge Structure</h3>
                <div className="urdb-field-grid" style={{ marginBottom: "0.5rem" }}>
                  <label>Seasonal/Monthly Rate Units :</label>
                  <select value={flatDemandUnit} onChange={(e) => setFlatDemandUnit(e.target.value)}>
                    {DEMAND_UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <PeriodTierEditor
                  periods={flatDemandPeriods}
                  onChange={setFlatDemandPeriods}
                  maxUsageLabel="Max kW Usage"
                  showMonthColumns
                  monthAssignment={flatDemandMonths}
                  onMonthAssignmentChange={setFlatDemandMonths}
                  disabled={disabled}
                />

                <h3 className="urdb-section-title">Time of Use Demand Charge Structure</h3>
                <div className="urdb-field-grid" style={{ marginBottom: "0.5rem" }}>
                  <label>Time of Use Rate Units :</label>
                  <select value={touDemandUnit} onChange={(e) => setTouDemandUnit(e.target.value)}>
                    {DEMAND_UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <PeriodTierEditor periods={touDemandPeriods} onChange={setTouDemandPeriods} maxUsageLabel="Max kW Usage" disabled={disabled} />

                <h3 className="urdb-section-title">Weekday Schedule</h3>
                <ScheduleGrid matrix={demandWeekdaySchedule} onChange={setDemandWeekdaySchedule} disabled={disabled} />

                <h3 className="urdb-section-title">Weekend Schedule</h3>
                <ScheduleGrid matrix={demandWeekendSchedule} onChange={setDemandWeekendSchedule} disabled={disabled} />

                <h3 className="urdb-section-title">Demand Ratchet Percentages</h3>
                <div className="month-input-row">
                  {MONTH_LABELS.map((m, i) => (
                    <label key={m}>
                      {m}
                      <input
                        value={demandRatchet[i]}
                        onChange={(e) => setDemandRatchet(demandRatchet.map((v, vi) => (vi === i ? e.target.value : v)))}
                      />
                    </label>
                  ))}
                </div>

                <div className="urdb-subsection-label">
                  <label className="radio-label" style={{ display: "inline-flex" }}>
                    <input type="checkbox" checked={hasCoincident} onChange={(e) => setHasCoincident(e.target.checked)} /> Include
                    coincident demand charge
                  </label>
                </div>
                {hasCoincident && (
                  <>
                    <h3 className="urdb-section-title">Coincident Demand Charge Structure</h3>
                    <div className="urdb-field-grid" style={{ marginBottom: "0.5rem" }}>
                      <label>Coincident Rate Units :</label>
                      <select value={coincidentUnit} onChange={(e) => setCoincidentUnit(e.target.value)}>
                        {DEMAND_UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <PeriodTierEditor periods={coincidentPeriods} onChange={setCoincidentPeriods} maxUsageLabel="Max kW Usage" disabled={disabled} />
                    <h3 className="urdb-section-title">Schedule</h3>
                    <ScheduleGrid matrix={coincidentSchedule} onChange={setCoincidentSchedule} disabled={disabled} />
                  </>
                )}

                <label>
                  Demand Comments :
                  <input value={demandComments} onChange={(e) => setDemandComments(e.target.value)} />
                </label>
              </>
            )}

            {tab === "Energy" && (
              <>
                <h3 className="urdb-section-title">Tiered Energy Usage Charge Structure</h3>
                <PeriodTierEditor
                  periods={energyPeriods}
                  onChange={setEnergyPeriods}
                  maxUsageLabel="Max Usage"
                  unitOptions={ENERGY_UNIT_OPTIONS}
                  showSellColumn
                  disabled={disabled}
                />

                <h3 className="urdb-section-title">Weekday Schedule</h3>
                <ScheduleGrid matrix={energyWeekdaySchedule} onChange={setEnergyWeekdaySchedule} disabled={disabled} />

                <h3 className="urdb-section-title">Weekend Schedule</h3>
                <ScheduleGrid matrix={energyWeekendSchedule} onChange={setEnergyWeekendSchedule} disabled={disabled} />

                <h3 className="urdb-section-title">Fuel Adjustments ($/kWh)</h3>
                <div className="month-input-row">
                  {MONTH_LABELS.map((m, i) => (
                    <label key={m}>
                      {m}
                      <input
                        value={fuelAdjustments[i]}
                        onChange={(e) => setFuelAdjustments(fuelAdjustments.map((v, vi) => (vi === i ? e.target.value : v)))}
                      />
                    </label>
                  ))}
                </div>

                <label>
                  Energy Comments :
                  <input value={energyComments} onChange={(e) => setEnergyComments(e.target.value)} />
                </label>
              </>
            )}

            {tab === "Fixed Charges" && (
              <>
                <h3 className="urdb-section-title">Fixed Charge Information</h3>
                <div className="urdb-field-grid">
                  <label>Fixed daily charge ($) :</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fixedDailyCharge}
                    onChange={(e) => setFixedDailyCharge(Number(e.target.value))}
                  />
                  <label>Fixed monthly charge ($) :</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fixedMonthlyCharge}
                    onChange={(e) => setFixedMonthlyCharge(Number(e.target.value))}
                  />
                  <label>Minimum monthly charge ($) :</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minMonthlyCharge}
                    onChange={(e) => setMinMonthlyCharge(Number(e.target.value))}
                  />
                  <label>Annual minimum charge ($) :</label>
                  <input
                    type="number"
                    step="0.01"
                    value={annualMinCharge}
                    onChange={(e) => setAnnualMinCharge(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {tab === "Other Attributes" && (
              <>
                <h3 className="urdb-section-title">Choose Other Atribute</h3>
                <div className="urdb-field-grid">
                  <label>Select Attribute Group :</label>
                  <select value={attributeGroup} onChange={(e) => setAttributeGroup(e.target.value as AttrGroup)}>
                    {ATTRIBUTE_GROUPS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <label>Available Other Attributes :</label>
                  <select value={availableAttribute} onChange={(e) => setAvailableAttribute(e.target.value)}>
                    <option value="">Select an Option</option>
                    {AVAILABLE_ATTRIBUTES[attributeGroup].map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn-search" onClick={handleAddFromSelector}>
                  <PlusIcon size={14} /> Add Attribute
                </button>

                {ATTRIBUTE_GROUPS.map((g) => {
                  const [rows] = attrState[g.value];
                  return (
                    <div key={g.value}>
                      <h3 className="urdb-section-title">{g.label}</h3>
                      <table className="attr-table">
                        <thead>
                          <tr>
                            <th>Attribute</th>
                            <th>Value</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i}>
                              <td>
                                <input
                                  value={row.attribute}
                                  onChange={(e) => updateAttributeRow(g.value, i, "attribute", e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  value={row.value}
                                  onChange={(e) => updateAttributeRow(g.value, i, "value", e.target.value)}
                                />
                              </td>
                              <td className="row-actions">
                                <button type="button" className="btn-danger-outline" onClick={() => deleteAttributeRow(g.value, i)}>
                                  <TrashIcon size={13} /> Delete Attribute
                                </button>
                                {i === rows.length - 1 && (
                                  <button type="button" className="btn-secondary" onClick={() => addAttributeRow(g.value)}>
                                    <PlusIcon size={13} /> Add Attribute
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {isEdit && (
                  <>
                    <h3 className="urdb-section-title">Revision History (Only Last 10)</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Admin</th>
                          <th>Action</th>
                          <th>Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revisions.map((r) => (
                          <tr key={r.id}>
                            <td>{new Date(r.createdAt).toLocaleString()}</td>
                            <td>
                              {r.admin.firstName} {r.admin.lastName}
                            </td>
                            <td>{r.action}</td>
                            <td>{r.note}</td>
                          </tr>
                        ))}
                        {revisions.length === 0 && (
                          <tr>
                            <td colSpan={4} className="muted">
                              No revisions yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </>
            )}
          </fieldset>

          {error && <div className="alert-error">{error}</div>}

          <StepToolbar />
        </form>
      </div>
    </div>
  );
}
