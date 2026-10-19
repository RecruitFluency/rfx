// What one recruiting mismatch costs: aid paid to an athlete who leaves, plus
// what it takes to replace them. Ballpark defaults from public NCAA figures;
// the department replaces them with its own (EADA) numbers.
import { useState } from "react";
import { Field, Input, Panel, PanelTitle, Select } from "./ui";
import { usd } from "../lib/format";

const PRESETS = [
  { key: "d1", label: "Division I, average across sports", aid: 18000, transfer: null as number | null },
  { key: "mbb", label: "D1 men's basketball", aid: 38000, transfer: 31 },
  { key: "wbb", label: "D1 women's basketball", aid: 38000, transfer: 22 },
  { key: "fbs", label: "FBS football", aid: 46000, transfer: 16 },
  { key: "base", label: "D1 baseball", aid: 18000, transfer: 18 },
  { key: "d2", label: "Division II, average across sports", aid: 7000, transfer: null },
  { key: "custom", label: "Your own numbers", aid: 0, transfer: null },
];

export function MismatchCost() {
  const [preset, setPreset] = useState("d1");
  const [aid, setAid] = useState("18000");
  const [years, setYears] = useState("1");
  const [replace, setReplace] = useState("");
  const [count, setCount] = useState("1");
  const p = PRESETS.find((x) => x.key === preset)!;
  const n = (v: string) => Math.max(0, Number(v.replace(/[^\d.]/g, "")) || 0);
  const one = n(aid) * n(years) + n(replace);
  const total = one * n(count);
  const pick = (k: string) => { setPreset(k); const x = PRESETS.find((y) => y.key === k)!; if (x.aid) setAid(String(x.aid)); };

  return (
    <Panel>
      <PanelTitle>What a mismatch costs</PanelTitle>
      <div className="p-6 grid lg:grid-cols-[1fr_1fr] gap-10">
        <div className="flex flex-col gap-5">
          <Field label="Start from"><Select value={preset} onChange={(e) => pick(e.target.value)}>{PRESETS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</Select></Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Athletic aid per year ($)" hint="Use your own number when you have it."><Input inputMode="numeric" value={aid} onChange={(e) => setAid(e.target.value)} /></Field>
            <Field label="Years paid before they leave"><Input inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} /></Field>
            <Field label="Cost to recruit a replacement ($)" hint="Travel, visits, staff time. Yours to fill in."><Input inputMode="numeric" value={replace} onChange={(e) => setReplace(e.target.value)} placeholder="0" /></Field>
            <Field label="Mismatches a year, this program"><Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
          </div>
        </div>
        <div>
          <div className="vekt-label">One mismatch</div>
          <div className="vekt-display text-[64px] sm:text-[84px] mt-2">{usd(one)}</div>
          <div className="vekt-label mt-6">A year, at {n(count)} {n(count) === 1 ? "mismatch" : "mismatches"}</div>
          <div className="vekt-display text-[44px] mt-2">{usd(total)}</div>
          {p.transfer && <p className="text-sm text-white/80 mt-6 font-light">For context: about {p.transfer}% of {p.label.replace("D1 ", "Division I ")} players transferred in 2021.</p>}
          <p className="text-sm text-vekt-grey mt-4 font-light">Not counted: a season of development lost, a roster spot under the new roster limits, and the staff time spent on a player who doesn't stay.</p>
        </div>
      </div>
      <p className="px-6 pb-6 text-xs text-vekt-grey font-light">
        Ballpark only. Aid defaults are rounded from NCAA finance data (average athletic aid per athlete, 2019-20) and vary widely by school and sport; your department's EADA filing has your real figures. Transfer rates are from NCAA transfer data for 2021.
      </p>
    </Panel>
  );
}
