import { Card, CardContent } from "@/components/ui/card";
import { Citation } from "@/components/Citation";

// Real, individually-verified statistics — each checked against its primary
// or authoritative source page directly (not just a search-engine summary)
// before being hardcoded here. No fabricated or estimated figures.
const FINDINGS = [
  {
    value: "$1.375B",
    label: "S&P settlement with DOJ and 19 states + D.C.",
    detail: "$687.5M federal civil penalty + $687.5M to states, announced Feb 3, 2015.",
    source: "https://www.justice.gov/archives/opa/pr/justice-department-and-state-partners-secure-1375-billion-settlement-sp-defrauding-investors",
  },
  {
    value: "$863.8M",
    label: "Moody's settlement with DOJ and 21 states + D.C.",
    detail: "$437.5M federal civil penalty + $426.3M to states, announced Jan 13, 2017.",
    source: "https://www.justice.gov/archives/opa/pr/justice-department-and-state-partners-secure-nearly-864-million-settlement-moody-s-arising",
  },
  {
    value: "73%",
    label: "of Moody's 2006 AAA-rated MBS downgraded to junk",
    detail: "By April 2010, per the Financial Crisis Inquiry Commission.",
    source: "https://en.wikipedia.org/wiki/Credit_rating_agencies_and_the_subprime_crisis",
  },
  {
    value: "$1.9T",
    label: "in MBS tranches downgraded, Q3 2007 – Q2 2008",
    detail: "Across all rating agencies, in a single 12-month span.",
    source: "https://en.wikipedia.org/wiki/Credit_rating_agencies_and_the_subprime_crisis",
  },
  {
    value: "50%+",
    label: "of 2005–2007 CDOs (by value) were “impaired” by end of 2009",
    detail: "A majority of the era's structured-credit issuance.",
    source: "https://en.wikipedia.org/wiki/Credit_rating_agencies_and_the_subprime_crisis",
  },
] as const;

export function KeyFindingsView() {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Verified figures from primary and authoritative public sources — not
        estimates. Each statistic links to the page it was confirmed against.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FINDINGS.map((f) => (
          <Card key={f.label}>
            <CardContent className="flex flex-col gap-2 pt-6">
              <span className="text-3xl font-semibold tabular-nums">{f.value}</span>
              <span className="text-sm font-medium leading-snug">{f.label}</span>
              <span className="text-xs text-muted-foreground">{f.detail}</span>
              <Citation url={f.source} label="Source" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
