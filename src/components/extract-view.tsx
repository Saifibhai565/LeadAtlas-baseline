"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Hint, Input, Label, Textarea, Toggle, Select } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatNumber } from "@/lib/utils";

type Result = {
  found: number;
  saved: number;
  pageUrl: string;
  sample: { title: string; category: string | null; phone: string | null; emails: string | null; website: string | null; address: string | null }[];
};

export function ExtractView() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [url, setUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [category, setCategory] = useState("");
  const [autoCheck, setAutoCheck] = useState(true);
  const [pages, setPages] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/extract")
      .then((r) => r.json())
      .then((b) => {
        setEnabled(Boolean(b.enabled));
        setAllowed(b.allowed !== false);
      })
      .catch(() => setEnabled(false));
  }, []);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, instructions, category, autoCheck, pages: Number(pages) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return void toast.error(body.error ?? "Extraction failed.");
      setResult(body);
      toast.success(body.saved ? `Saved ${body.saved} new leads.` : "Nothing new found on that page.");
    } catch {
      toast.error("Can't reach the app server.");
    } finally {
      setLoading(false);
    }
  }

  if (enabled === false && !allowed) {
    return (
      <Panel className="max-w-2xl p-6">
        <Sparkles className="h-5 w-5 text-pin" aria-hidden />
        <h2 className="mt-3 text-[15px] font-semibold">The web extractor is part of Pro and Agency</h2>
        <p className="mt-1 text-sm text-muted">
          Upgrade to pull businesses from any directory page, and to write personal messages with AI.
        </p>
        <Link href="/billing" className="mt-4 inline-flex h-10 items-center rounded-control bg-pin px-4 text-sm font-semibold text-pin-ink">
          See plans
        </Link>
      </Panel>
    );
  }

  if (enabled === false) {
    return (
      <Panel className="max-w-2xl p-6">
        <KeyRound className="h-5 w-5 text-pin" aria-hidden />
        <h2 className="mt-3 text-[15px] font-semibold">Connect an AI key to turn this on</h2>
        <p className="mt-1 text-sm text-muted">
          The extractor reads a page the way a person would and pulls out the businesses listed on it, so it works on
          directories with any layout.
        </p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm">
          <li>Create a key at console.anthropic.com.</li>
          <li>
            Put it in your <code className="text-pin">.env</code> file as <code className="text-pin">ANTHROPIC_API_KEY</code>.
          </li>
          <li>Stop and restart <code className="text-pin">npm run dev</code>.</li>
        </ol>
      </Panel>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[400px_1fr]">
      <Panel>
        <PanelHeader title="Extract from a page" description="Works best on directory and listing pages." />
        <form onSubmit={run} className="space-y-5 p-5">
          <div>
            <Label htmlFor="url">Page address</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/members/lahore"
              required
            />
            <Hint>Public pages only. Pages that ask bots to stay away are skipped.</Hint>
          </div>
          <div>
            <Label htmlFor="pages">Follow next-page links</Label>
            <Select id="pages" value={pages} onChange={(e) => setPages(e.target.value)}>
              <option value="1">This page only</option>
              <option value="3">Up to 3 pages</option>
              <option value="5">Up to 5 pages</option>
              <option value="10">Up to 10 pages</option>
            </Select>
            <Hint>For directories with page 1, 2, 3… the extractor follows the “next” link. 1 credit per new business.</Hint>
          </div>
          <div>
            <Label htmlFor="instructions">What to look for (optional)</Label>
            <Textarea
              id="instructions"
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Only the clinics, skip the ads"
            />
          </div>
          <div>
            <Label htmlFor="category">Category for these leads (optional)</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Clinic" />
          </div>
          <Toggle
            checked={autoCheck}
            onChange={setAutoCheck}
            label="Check their websites afterwards"
            description="Finds emails and social pages, and scores each site."
          />
          <Button type="submit" className="w-full" loading={loading} disabled={enabled == null}>
            <Sparkles className="h-4 w-4" aria-hidden />
            {loading ? "Reading the page…" : "Extract businesses"}
          </Button>
          <Hint>Each new lead uses 1 credit, the same as a map search.</Hint>
        </form>
      </Panel>

      <Panel>
        <PanelHeader
          title={result ? `Found ${formatNumber(result.found)}, saved ${formatNumber(result.saved)} new` : "Results"}
          description={result ? result.pageUrl : "Businesses found on the page will be listed here."}
          action={
            result?.saved ? (
              <Link href="/leads?source=WEB" className="text-[13px] font-medium text-pin hover:underline">
                Open in leads
              </Link>
            ) : undefined
          }
        />
        {!result ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            {loading ? "Reading the page and picking out the businesses. This takes 10 to 40 seconds." : "Paste a page address to begin."}
          </p>
        ) : result.sample.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No businesses were found on that page. Try a page that lists several businesses with their details.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.sample.map((b, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{b.title}</p>
                      {b.category && <p className="text-[13px] text-muted">{b.category}</p>}
                    </td>
                    <td className="tabular px-4 py-2.5">{b.phone ?? <span className="text-muted">-</span>}</td>
                    <td className="px-4 py-2.5 text-info">{b.emails ?? <span className="text-muted">-</span>}</td>
                    <td className="max-w-[260px] px-4 py-2.5 text-[13px] text-muted">{b.address ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
