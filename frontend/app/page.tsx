"use client";

import { Hero } from "@/components/ui/animated-shader-hero";

export default function HomePage() {
  return (
    <Hero
      headline={{ line1: "Stay on Track", line2: "Stay Ahead" }}
      subtitle="Plan projects, track tasks, and stay aligned — with a clean, focused workflow."
      badge="Project Management Reimagined"
      primaryLabel="Sign in"
      primaryHref="/login"
      secondaryLabel="Create account"
      secondaryHref="/signup"
    />
  );
}
