"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve all URL parameters when redirecting to chart.html
    const params = searchParams.toString();
    window.location.replace("/chart.html" + (params ? "?" + params : ""));
  }, [searchParams]);

  return null;
}
