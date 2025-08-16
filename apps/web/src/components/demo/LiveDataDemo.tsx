"use client";

import { useLessons } from "@/hooks/useLessons";

export function LiveDataDemo() {
  const { data: lessons = [], isLoading, error, dataUpdatedAt } = useLessons();

  const formatLastUpdate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        📊 Live Data Updates Demo
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Real-time lesson data with TanStack Query (auto-refresh every 30
        seconds).
      </p>

      <div className="space-y-4">
        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-3 ${isLoading ? "bg-yellow-500" : "bg-green-500"}`}
            ></div>
            <span className="text-gray-700">
              Status: {isLoading ? "Loading..." : error ? "Error" : "Connected"}
            </span>
          </div>

          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
            <span className="text-gray-700">Lessons: {lessons.length}</span>
          </div>

          <div className="flex items-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
            <span className="text-gray-700">
              Last Update:{" "}
              {dataUpdatedAt ? formatLastUpdate(dataUpdatedAt) : "Never"}
            </span>
          </div>
        </div>

        {/* Recent Lessons */}
        {lessons.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Recent Lessons:
            </h4>
            <div className="space-y-2">
              {lessons.slice(0, 3).map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                >
                  <span className="font-mono">{lesson.id}</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      lesson.status === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : lesson.status === "requested"
                          ? "bg-purple-100 text-purple-800"
                          : lesson.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {lesson.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>🔄 Auto-refresh:</strong> Data automatically refreshes every
            30 seconds
            <br />
            <strong>⚡ Optimistic Updates:</strong> Changes appear immediately,
            then sync with server
          </p>
        </div>
      </div>
    </div>
  );
}
