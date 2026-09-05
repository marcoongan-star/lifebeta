import type { Metadata } from "next";
import { InflationTracker } from "../inflation-tracker";

export const metadata: Metadata = {
  title: "LifeBeta Food Inflation Tracker",
  description: "Inspect saved baskets, price normalization, missing-data blocks, stale warnings, and released-CPI comparisons.",
  openGraph: { title: "LifeBeta Food Inflation Tracker", description: "Transparent personal food-inflation evidence behind Baroke.", images: [] },
  twitter: { card: "summary", title: "LifeBeta Food Inflation Tracker", description: "Transparent personal food-inflation evidence behind Baroke.", images: [] },
};

export default function TrackerPage() { return <InflationTracker />; }
