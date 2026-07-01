"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api, type AdminObservabilitySnapshot } from "../../../lib/api";
import { useUser } from "../../../lib/UserContext";

const DEFAULT_PACKAGE = "sat";

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export default function AdminSettingsPage() {
  const { user, loading } = useUser();
  const [packageSlug, setPackageSlug] = useState(DEFAULT_PACKAGE);
  const [topN, setTopN] = useState(10);
  const [data, setData] = useState<AdminObservabilitySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const allowlist = useMemo(
    () => parseAllowlist(process.env.NEXT_PUBLIC_INTERNAL_ADMIN_EMAILS),
    [],
  );

  const userEmail = (user?.email as string | undefined)?.toLowerCase() || "";
  const allowlistConfigured = allowlist.size > 0;
  const clientAllowsUser = !allowlistConfigured || (userEmail && allowlist.has(userEmail));

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snapshot = await api.admin.observability(packageSlug, topN);
      setData(snapshot);
    } catch (e: any) {
      setData(null);
      setError(e?.message || "Failed to load admin observability data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user && clientAllowsUser) {
      void load();
    }
  }, [loading, user, clientAllowsUser]);

  if (loading) return null;

  if (!user) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Internal Admin Dashboard</h1>
        <p>Sign in to access this developer-only page.</p>
        <Link href="/settings">Back to Settings</Link>
      </div>
    );
  }

  if (!clientAllowsUser) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Internal Admin Dashboard</h1>
        <p>This account is not in the local developer allowlist.</p>
        <Link href="/settings">Back to Settings</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Internal Admin Dashboard</h1>
      <p>Developer-only observability for package graph and question infrastructure.</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
        <label htmlFor="packageSlug">Package slug</label>
        <input
          id="packageSlug"
          value={packageSlug}
          onChange={(e) => setPackageSlug(e.target.value.trim())}
          placeholder="sat"
        />

        <label htmlFor="topN">Top connected</label>
        <input
          id="topN"
          type="number"
          min={1}
          max={50}
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value) || 10)}
        />

        <button type="button" onClick={() => void load()} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <pre style={{ whiteSpace: "pre-wrap", color: "#a00", marginTop: 12 }}>
          {error}
        </pre>
      )}

      {data && (
        <>
          <h2 style={{ marginTop: 24 }}>Counts</h2>
          <ul>
            <li>Package count: {data.counts.package_count}</li>
            <li>Concept count: {data.counts.concept_count}</li>
            <li>Relationship count: {data.counts.relationship_count}</li>
            <li>Question count: {data.counts.question_count}</li>
          </ul>

          <h2 style={{ marginTop: 24 }}>Graph Validation</h2>
          <p>
            Status: {data.graph_validation.valid === true ? "VALID" : data.graph_validation.valid === false ? "INVALID" : "N/A"}
          </p>
          {data.graph_validation.error && (
            <pre style={{ whiteSpace: "pre-wrap", color: "#a00" }}>
              {data.graph_validation.error}
            </pre>
          )}

          <h2 style={{ marginTop: 24 }}>Top Connected Concepts</h2>
          {data.top_connected_concepts.length === 0 ? (
            <p>No relationships found for this scope.</p>
          ) : (
            <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th align="left">Concept</th>
                  <th align="left">Slug</th>
                  <th align="right">Incoming</th>
                  <th align="right">Outgoing</th>
                  <th align="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.top_connected_concepts.map((item) => (
                  <tr key={item.concept_id}>
                    <td>{item.name || "(unnamed)"}</td>
                    <td>{item.slug || "(no slug)"}</td>
                    <td align="right">{item.incoming}</td>
                    <td align="right">{item.outgoing}</td>
                    <td align="right">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/settings">Back to Settings</Link>
      </div>
    </div>
  );
}
