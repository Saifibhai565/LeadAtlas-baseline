"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-[#141A23] px-4 py-2 text-sm font-medium text-white">
      Print or save as PDF
    </button>
  );
}
