"use client";
import { useEffect, useState } from "react";

export default function Check() {
  const [data, setData] = useState<string>("Loading…");
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    fetch(`${backend}/health`)
      .then((r) => r.json())
      .then((d) => setData(JSON.stringify(d)))
      .catch((e) => setData(String(e)));
  }, [backend]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-xl font-semibold">Backend connectivity</h1>
      <p className="mb-4 text-sm opacity-70">BACKEND: {backend}</p>
      <pre className="rounded-xl border p-4">{data}</pre>
    </div>
  );
}
