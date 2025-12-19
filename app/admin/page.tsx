"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [config, setConfig] = useState({
    "User-Id": "",
    "Profile-Id": "",
    Authorization: "",
    Profile: "",
  });

  const fetchConfig = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/config", {
        headers: { "x-admin-password": password },
      });
      if (resp.status === 401) {
        setMessage("Неверный пароль");
        setAuthorized(false);
        return;
      }
      const json = await resp.json();
      setConfig(json || config);
      setAuthorized(true);
    } catch (e: any) {
      setMessage(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setMessage(null);
    setLoading(true);
    try {
      const resp = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(config),
      });
      if (resp.status === 401) {
        setMessage("Неверный пароль");
        setAuthorized(false);
        return;
      }
      if (!resp.ok) throw new Error(`Ошибка ${resp.status}`);
      setMessage("Сохранено");
    } catch (e: any) {
      setMessage(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Админ-панель</h1>

      {!authorized && (
        <div className="space-y-2 mb-4">
          <Input
            value={password}
            onChange={(e: any) => setPassword(e.target.value)}
            placeholder="Пароль администратора"
          />
          <div className="flex gap-2">
            <Button onClick={fetchConfig} disabled={loading || !password}>
              Войти
            </Button>
          </div>
          {message && <div className="text-sm text-red-600">{message}</div>}
        </div>
      )}

      {authorized && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">User-Id</label>
            <Input value={config["User-Id"]} onChange={(e: any) => setConfig({ ...config, ["User-Id"]: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium">Profile-Id</label>
            <Input value={config["Profile-Id"]} onChange={(e: any) => setConfig({ ...config, ["Profile-Id"]: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium">Authorization</label>
            <Input value={config.Authorization} onChange={(e: any) => setConfig({ ...config, Authorization: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium">Profile (JSON)</label>
            <textarea
              value={config.Profile}
              onChange={(e: any) => setConfig({ ...config, Profile: e.target.value })}
              className="w-full min-h-[100px] rounded-md border px-2 py-1"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={saveConfig} disabled={loading}>
              Сохранить
            </Button>
          </div>

          {message && <div className="text-sm text-green-600">{message}</div>}
        </div>
      )}
    </div>
  );
}
