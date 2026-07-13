function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Citation({ url, label }: { url: string; label?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
    >
      {label ?? hostname(url)}
    </a>
  );
}

export function CitationList({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs font-medium text-muted-foreground">Sources:</span>
      {urls.map((url) => (
        <Citation key={url} url={url} />
      ))}
    </div>
  );
}
