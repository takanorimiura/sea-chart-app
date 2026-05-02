"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function Redirector() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    window.location.replace("/chart.html" + (params ? "?" + params : ""));
  }, [searchParams]);

  return null;
}

export default function Home() {
  return (
    <Suspense>
      <Redirector />
    </Suspense>
  );
}
