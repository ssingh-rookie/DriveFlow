"use client";

import { useNotifications } from "@/context/NotificationContext";

export function NotificationDemo() {
  const { addNotification } = useNotifications();

  const showSuccessNotification = () => {
    addNotification(
      "success",
      "Lesson Booked!",
      "Your driving lesson has been successfully booked for tomorrow at 2:00 PM.",
    );
  };

  const showErrorNotification = () => {
    addNotification(
      "error",
      "Booking Failed",
      "Unable to book lesson. Please check your internet connection and try again.",
    );
  };

  const showWarningNotification = () => {
    addNotification(
      "warning",
      "Payment Pending",
      "Your lesson is booked but payment is still pending. Please complete payment within 24 hours.",
    );
  };

  const showInfoNotification = () => {
    addNotification(
      "info",
      "Lesson Reminder",
      "Your lesson starts in 1 hour. Please arrive 5 minutes early.",
      { duration: 10000 }, // Show for 10 seconds
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        🔔 Notification System Demo
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Test the notification system with different types of lesson-related
        notifications.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={showSuccessNotification}
          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
        >
          ✅ Success Notification
        </button>

        <button
          onClick={showErrorNotification}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
        >
          ❌ Error Notification
        </button>

        <button
          onClick={showWarningNotification}
          className="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
        >
          ⚠️ Warning Notification
        </button>

        <button
          onClick={showInfoNotification}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          ℹ️ Info Notification
        </button>
      </div>
    </div>
  );
}
