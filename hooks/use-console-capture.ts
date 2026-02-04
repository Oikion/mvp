"use client";

import { useEffect, useRef } from "react";

interface ConsoleLog {
  type: string;
  message: string;
  timestamp: number;
  args?: any[];
}

export function useConsoleCapture(enabled: boolean = true) {
  const logsRef = useRef<ConsoleLog[]>([]);
  const originalConsoleRef = useRef<{
    log?: typeof console.log;
    error?: typeof console.error;
    warn?: typeof console.warn;
    info?: typeof console.info;
  }>({});

  useEffect(() => {
    if (!enabled) {
      // Restore original console methods if disabled
      if (originalConsoleRef.current.log) console.log = originalConsoleRef.current.log;
      if (originalConsoleRef.current.error) console.error = originalConsoleRef.current.error;
      if (originalConsoleRef.current.warn) console.warn = originalConsoleRef.current.warn;
      if (originalConsoleRef.current.info) console.info = originalConsoleRef.current.info;
      return;
    }

    // Store original console methods
    originalConsoleRef.current = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    // Override console methods
    console.log = (...args: any[]) => {
      logsRef.current.push({
        type: "log",
        message: args.map(arg => 
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" "),
        timestamp: Date.now(),
        args: args,
      });
      originalConsoleRef.current.log?.(...args);
    };

    console.error = (...args: any[]) => {
      logsRef.current.push({
        type: "error",
        message: args.map(arg => 
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" "),
        timestamp: Date.now(),
        args: args,
      });
      originalConsoleRef.current.error?.(...args);
    };

    console.warn = (...args: any[]) => {
      logsRef.current.push({
        type: "warn",
        message: args.map(arg => 
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" "),
        timestamp: Date.now(),
        args: args,
      });
      originalConsoleRef.current.warn?.(...args);
    };

    console.info = (...args: any[]) => {
      logsRef.current.push({
        type: "info",
        message: args.map(arg => 
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(" "),
        timestamp: Date.now(),
        args: args,
      });
      originalConsoleRef.current.info?.(...args);
    };

    // Cleanup on unmount
    return () => {
      if (originalConsoleRef.current.log) console.log = originalConsoleRef.current.log;
      if (originalConsoleRef.current.error) console.error = originalConsoleRef.current.error;
      if (originalConsoleRef.current.warn) console.warn = originalConsoleRef.current.warn;
      if (originalConsoleRef.current.info) console.info = originalConsoleRef.current.info;
    };
  }, [enabled]);

  const getLogs = () => logsRef.current;
  const clearLogs = () => { logsRef.current = []; };

  return { getLogs, clearLogs };
}

