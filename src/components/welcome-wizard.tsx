"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, MessageCircle, Target, Sparkles } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Find businesses", text: "Go to Searches and type a type and city, like “dentist in Lahore”. Businesses arrive in minutes with phone, website and rating." },
  { icon: Target, title: "See who needs you", text: "Each lead gets a score and signals (no website, recently opened, runs ads) so you know who to contact first." },
  { icon: MessageCircle, title: "Reach out", text: "Open a lead, pick a template or write with AI, and send on WhatsApp, SMS or email — ready in one tap." },
  { icon: Sparkles, title: "Win the deal", text: "Make a website demo, send a proposal with an Accept button, and track everything on the pipeline." },
];

export function WelcomeWizard() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch("/api/account/onboard")
      .then((r) => r.json())
      .then((b) => {
        if (!b.done) {
          setShow(true);
          setName(b.name ?? "");
        }
      })
      .catch(() => undefined);
  }, []);

  function close() {
    setShow(false);
    fetch("/api/account/onboard", { method: "POST" }).catch(() => undefined);
  }

  if (!show) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-panel border border-line bg-surface shadow-2xl">
        <div className="bg-gradient-to-b from-pin/15 to-transparent p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-pin/15">
            <Icon className="h-7 w-7 text-pin" aria-hidden />
          </div>
          <p className="mt-4 text-[12px] uppercase tracking-wide text-muted">
            {step === 0 ? `Welcome${name ? `, ${name}` : ""}!` : `Step ${step + 1} of ${STEPS.length}`}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{s.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{s.text}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line p-4">
          <button onClick={close} className="text-[13px] text-muted hover:text-ink">
            Skip
          </button>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-pin" : "bg-raised"}`} />
            ))}
          </div>
          {last ? (
            <Link href="/searches" onClick={close} className="rounded-control bg-pin px-4 py-2 text-sm font-semibold text-pin-ink">
              Start searching
            </Link>
          ) : (
            <button onClick={() => setStep((x) => x + 1)} className="rounded-control bg-pin px-4 py-2 text-sm font-semibold text-pin-ink">
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
