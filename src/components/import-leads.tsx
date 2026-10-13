"use client";

import Papa from "papaparse";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Toggle } from "@/components/ui/field";
import { cn, formatNumber } from "@/lib/utils";

type Row = { name: string; phone?: string; email?: string; website?: string; address?: string; category?: string };

// Column names people commonly use, in English and Roman Urdu
const GUESS: Record<keyof Row, RegExp> = {
  name: /^(name|business|business name|company|title|naam|shop)$/i,
  phone: /phone|mobile|contact|number|whatsapp|tel/i,
  email: /e-?mail/i,
  website: /website|site|url|web/i,
  address: /address|location|pata|area/i,
  category: /category|type|industry|niche/i,
};

function mapRows(data: Record<string, string>[]): Row[] {
  if (data.length === 0) return [];
  const headers = Object.keys(data[0]);
  const pick = (k: keyof Row) => headers.find((h) => GUESS[k].test(h.trim()));
  const cols = {
    name: pick("name") ?? headers[0],
    phone: pick("phone"),
    email: pick("email"),
    website: pick("website"),
    address: pick("address"),
    category: pick("category"),
  };
  return data
    .map((r) => ({
      name: (r[cols.name] ?? "").trim(),
      phone: cols.phone ? r[cols.phone] : undefined,
      email: cols.email ? r[cols.email] : undefined,
      website: cols.website ? r[cols.website] : undefined,
      address: cols.address ? r[cols.address] : undefined,
      category: cols.category ? r[cols.category] : undefined,
    }))
    .filter((r) => r.name);
}

export function ImportLeads({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<"one" | "csv">("one");
  const [one, setOne] = useState<Row>({ name: "" });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [check, setCheck] = useState(true);
  const [saving, setSaving] = useState(false);

  function readFile(file: File) {
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const mapped = mapRows(res.data);
        setRows(mapped);
        if (mapped.length === 0) toast.error("No rows with a business name were found in that file.");
      },
      error: () => toast.error("That file couldn't be read. Save it as CSV and try again."),
    });
  }

  async function submit(list: Row[]) {
    setSaving(true);
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: list, check }),
    });
    const b = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(b.error ?? "Couldn't add the leads.");
    toast.success(
      `Added ${formatNumber(b.added)} lead${b.added === 1 ? "" : "s"}${b.skipped ? `, ${formatNumber(b.skipped)} you already had` : ""}.`,
    );
    onDone();
    onClose();
  }

  const field = (k: keyof Row, label: string, placeholder = "") => (
    <div>
      <Label htmlFor={`one-${k}`}>{label}</Label>
      <Input id={`one-${k}`} value={one[k] ?? ""} onChange={(e) => setOne({ ...one, [k]: e.target.value })} placeholder={placeholder} required={k === "name"} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-[8vh]" role="dialog" aria-modal aria-label="Add leads">
      <button className="fixed inset-0 bg-night/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg rounded-panel border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex rounded-control border border-line p-0.5 text-[13px]" role="tablist">
            {(
              [
                ["one", "Add one"],
                ["csv", "Import a CSV"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn("h-7 rounded-[7px] px-3", tab === k ? "bg-raised text-ink" : "text-muted hover:text-ink")}
              >
                {l}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {tab === "one" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit([one]);
              }}
              className="space-y-4"
            >
              {field("name", "Business name", "Al-Shifa Dental Clinic")}
              <div className="grid gap-4 sm:grid-cols-2">
                {field("phone", "Phone", "0300 1234567")}
                {field("email", "Email")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("website", "Website")}
                {field("category", "Category", "Dental clinic")}
              </div>
              {field("address", "Address")}
              <Toggle checked={check} onChange={setCheck} label="Check the website" />
              <Button type="submit" loading={saving} className="w-full">
                Add lead
              </Button>
            </form>
          ) : (
            <>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-panel border border-dashed border-line px-6 py-8 text-center hover:border-pin/50">
                <Upload className="h-5 w-5 text-pin" aria-hidden />
                <span className="text-sm font-medium">{fileName || "Choose a CSV file"}</span>
                <span className="text-[13px] text-muted">From Excel: File, Save As, CSV UTF-8</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
              </label>
              <Hint>
                Columns are matched by name: business name, phone, email, website, address, category. Your own lists don't use credits.
              </Hint>
              {rows && rows.length > 0 && (
                <div className="rounded-control border border-line">
                  <p className="border-b border-line px-3 py-2 text-[13px]">
                    <span className="tabular font-medium">{formatNumber(rows.length)}</span> businesses found
                    {rows.length > 2000 && ", the first 2,000 will be added"}
                  </p>
                  <ul className="max-h-40 divide-y divide-line overflow-y-auto text-[13px]">
                    {rows.slice(0, 5).map((r, i) => (
                      <li key={i} className="px-3 py-1.5">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted">{[r.phone, r.email, r.website].filter(Boolean).map((x) => `, ${x}`).join("")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Toggle checked={check} onChange={setCheck} label="Check their websites" />
              <Button className="w-full" loading={saving} disabled={!rows?.length} onClick={() => rows && submit(rows.slice(0, 2000))}>
                Import {rows?.length ? formatNumber(Math.min(rows.length, 2000)) : ""} leads
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
