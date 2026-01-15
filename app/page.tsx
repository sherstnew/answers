"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/search?name=${encodeURIComponent(query)}`);
      const json = await resp.json().catch(() => ({}));

      if (resp.status === 401 || resp.status === 403) {
        const message = json?.error || resp.statusText || resp.status;
        setError(`Ошибка авторизации: ${message}`);
        setResults([{ id: `error-${resp.status}`, name: `Ошибка авторизации: ${message}`, type: 'error' }]);
        return;
      }

      if (!resp.ok) {
        const message = json?.error || `Server error ${resp.status}`;
        setError(message);
        setResults([{ id: `error-${resp.status}`, name: message, type: 'error' }]);
        return;
      }

      setResults(json.data || []);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      setResults([{ id: 'error-exception', name: msg, type: 'error' }]);
    } finally {
      setLoading(false);
    }
    };

  const handleOpen = (id: string) => {
    setLoadingId(id);
    try {
      // open in new tab
      window.open(`/test/${id}`, "_blank", "noopener,noreferrer");
    } finally {
      // keep loading briefly for UX
      setTimeout(() => setLoadingId(null), 300);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-12 gap-5">
      <header className="w-full text-2xl font-bold text-center">ПУЛЕЙ ВВЕЛ НАЗВАНИЕ ТЕСТА</header>

      <div className="flex gap-2 w-full max-w-2xl">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Введите название теста" />
        <Button onClick={handleSearch}>Найти</Button>
      </div>

      {loading && <div>Идёт поиск...</div>}
      {error && <div className="text-red-500">У ТЕБЯ ОШИБКА {error}</div>}

      <ul className="w-full max-w-2xl mt-4 space-y-2">
        {results.map((item) => (
          <li key={item.id} className="p-3 border rounded hover:bg-gray-50/10 flex justify-between items-center">
            <div>
              <div className="font-semibold">{item.name || item.title || item.alias}</div>
              <div className="text-sm text-gray-500">id: {item.id} — {item.type}</div>
            </div>
            <div>
              <Button
                onClick={() => handleOpen(item.id)}
                disabled={!!loadingId && loadingId !== item.id}
              >
                {loadingId === item.id ? "Загрузка..." : "Открыть"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
