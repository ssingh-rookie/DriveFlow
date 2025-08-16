"use client";

import { useLessons } from "@/hooks/useLessons";
import { useNotifications } from "@/context/NotificationContext";

export function QueryDebugger() {
  const { data, isLoading, error, isError, status, dataUpdatedAt } =
    useLessons();
  const { addNotification } = useNotifications();

  const testDirectFetch = async () => {
    try {
      console.log("🔍 Testing direct fetch...");
      const response = await fetch("http://localhost:3001/api/lessons");
      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Data received:", data);

      addNotification(
        "success",
        "Direct Fetch Success",
        `Fetched ${Array.isArray(data) ? data.length : "unknown"} lessons directly`,
      );
    } catch (err) {
      console.error("❌ Direct fetch failed:", err);
      addNotification(
        "error",
        "Direct Fetch Failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        🐛 React Query Debug
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-24">Status:</span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                status === "success"
                  ? "bg-green-100 text-green-800"
                  : status === "error"
                    ? "bg-red-100 text-red-800"
                    : status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              {status}
            </span>
          </div>

          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-24">Loading:</span>
            <span className={isLoading ? "text-yellow-600" : "text-green-600"}>
              {isLoading ? "⏳ Yes" : "✅ No"}
            </span>
          </div>

          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-24">Error:</span>
            <span className={isError ? "text-red-600" : "text-green-600"}>
              {isError ? "❌ Yes" : "✅ No"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-24">Data:</span>
            <span className="text-gray-600">
              {data
                ? `${Array.isArray(data) ? data.length : "unknown"} lessons`
                : "null"}
            </span>
          </div>

          <div className="flex items-center">
            <span className="font-medium text-gray-700 w-24">Updated:</span>
            <span className="text-gray-600">
              {dataUpdatedAt
                ? new Date(dataUpdatedAt).toLocaleTimeString()
                : "Never"}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800 font-medium">Error Details:</p>
          <p className="text-xs text-red-700 mt-1 font-mono">
            {error instanceof Error ? error.message : JSON.stringify(error)}
          </p>
        </div>
      )}

      {data && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800 font-medium">
            Raw Data ({Array.isArray(data) ? data.length : "unknown"} items):
          </p>
          <pre className="text-xs text-blue-700 mt-1 overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={testDirectFetch}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          🔍 Test Direct Fetch
        </button>
      </div>
    </div>
  );
}
