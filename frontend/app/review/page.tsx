import type { Metadata } from "next";
import { ReviewWorkspace } from "./review-workspace";

export const metadata: Metadata = {
  title: "Evidence Review — Baroke",
  description: "Protected Baroke evidence review operations.",
  robots: { index: false, follow: false },
  openGraph: { title: "Evidence Review — Baroke", description: "Protected Baroke operations.", images: [] },
  twitter: { card: "summary", title: "Evidence Review — Baroke", description: "Protected Baroke operations.", images: [] },
};

export default function ReviewPage() {
  return <ReviewWorkspace />;
}
