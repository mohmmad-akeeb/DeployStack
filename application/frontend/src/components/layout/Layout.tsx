import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { healthApi, HealthResponse } from "../../api";
import { Navbar } from "./Navbar";
import { Server, ShieldCheck } from "lucide-react";

export const Layout: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  useEffect(() => {
    let mounted = true;
    healthApi
      .check()
      .then((data) => {
        if (mounted) setHealth(data);
      })
      .catch(() => {
        if (mounted) setHealth(null);
      })
      .finally(() => {
        if (mounted) setLoadingHealth(false);
      });

    const interval = setInterval(() => {
      healthApi
        .check()
        .then((data) => {
          if (mounted) setHealth(data);
        })
        .catch(() => {
          if (mounted) setHealth(null);
        });
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span>DeployStack — Three-Tier Cloud Workspace</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Backend:</span>
              {loadingHealth ? (
                <span className="text-slate-400">checking...</span>
              ) : health ? (
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {health.status} ({health.environment})
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Offline
                </span>
              )}
            </div>

            {health?.database_connected && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                PostgreSQL Connected
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
