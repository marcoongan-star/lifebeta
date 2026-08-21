import type { Metadata } from "next";
import { InflationTracker } from "./inflation-tracker";

export const metadata: Metadata = {
  title: "LifeBeta — Personal Inflation Tracker",
  description: "Compare the price growth of your own saved basket with released CPI data.",
};

export default function Home() {
  return <InflationTracker />;
}
