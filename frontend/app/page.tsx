import type { Metadata } from "next";
import { headers } from "next/headers";
import { StudentEatsLanding } from "./student-eats-landing";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/baroque-social-card.png`;

  return {
    title: "Baroke — Baruch Student Eats, powered by LifeBeta",
    description: "Find affordable food, student discounts, and verified deals around Baruch—backed by transparent food-inflation data.",
    openGraph: {
      title: "Baroke — Baruch Student Eats",
      description: "The city got expensive. Lunch shouldn't.",
      type: "website",
      images: [{ url: image, width: 900, height: 472, alt: "Baroke — Baruch Student Eats" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Baroke — Baruch Student Eats",
      description: "The city got expensive. Lunch shouldn't.",
      images: [image],
    },
  };
}

export default function Home() {
  return <StudentEatsLanding />;
}
