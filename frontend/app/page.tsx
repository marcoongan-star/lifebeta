import type { Metadata } from "next";
import { headers } from "next/headers";
import { StudentEatsLanding } from "./student-eats-landing";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/baroke-social-card-v2.jpg`;

  return {
    title: "Baroke — Verified Meal Prices",
    description: "Find verified meal prices and add places for review.",
    openGraph: {
      title: "Baroke — Verified Meal Prices",
      description: "The city got expensive. Lunch shouldn't.",
      type: "website",
      images: [{ url: image, width: 600, height: 314, alt: "Baroke — Powered by LifeBeta" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Baroke — Verified Meal Prices",
      description: "The city got expensive. Lunch shouldn't.",
      images: [image],
    },
  };
}

export default function Home() {
  return <StudentEatsLanding />;
}
