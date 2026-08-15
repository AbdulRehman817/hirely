import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface AffiliateSlideInProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  delayMs?: number;
  storageKey?: string;
}

/**
 * A small, dismissible sponsored/affiliate card that slides in from the
 * bottom-right corner. Non-blocking (not a modal/popup) so it never
 * interrupts job browsing. Shows once per browser session.
 */
export default function AffiliateSlideIn({
  title = "Interview-ready watch",
  description = "Look sharp for your next interview.",
  imageUrl = "/public/affiliate-watch.jpg",
  linkUrl = "https://amzn.to/3TTiBTb",
  linkLabel = "View on Amazon →",
  delayMs = 4000,
  storageKey = "hirely_affiliate_dismissed",
}: AffiliateSlideInProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const alreadyDismissed = sessionStorage.getItem(storageKey);
    if (alreadyDismissed) {
      setDismissed(true);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem(storageKey, "true");
  };

  if (dismissed || !visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Sponsored recommendation"
      className="fixed bottom-5 right-5 z-50 w-[230px] rounded-xl border border-border bg-background p-4 shadow-lg animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
          Sponsored
        </span>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="w-full h-28 rounded-lg overflow-hidden mb-2.5 bg-muted flex items-center justify-center">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-contain"
        />
      </div>

      <p className="font-medium text-[13px] text-foreground mb-1">{title}</p>
      <p className="text-[12px] text-muted-foreground leading-snug mb-2.5">
        {description}
      </p>

      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="text-[12px] text-primary hover:underline font-medium"
      >
        {linkLabel}
      </a>
    </div>
  );
}