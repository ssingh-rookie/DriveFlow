"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  NotificationBanner,
  Notification,
  NotificationType,
} from "@/components/ui/NotificationBanner";

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: { autoHide?: boolean; duration?: number },
  ) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      options: { autoHide?: boolean; duration?: number } = {},
    ) => {
      const notification: Notification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        autoHide: options.autoHide,
        duration: options.duration,
      };

      setNotifications((prev) => [...prev, notification]);
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Render notifications */}
      <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
        <div className="flex flex-col space-y-3 pointer-events-auto">
          {notifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{
                zIndex: 9999 - index,
              }}
              className="transform transition-all duration-300 ease-in-out"
            >
              <NotificationBanner
                notification={notification}
                onClose={removeNotification}
              />
            </div>
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}
