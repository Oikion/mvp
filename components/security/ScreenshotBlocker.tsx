"use client";

import { useEffect } from "react";

/**
 * ScreenshotBlocker Component
 * 
 * Implements multiple layers of screenshot protection for sensitive content:
 * 
 * 1. CSS-based protection (user-select: none, pointer-events protection)
 * 2. DOM manipulation prevention
 * 3. Canvas/WebGL capture blocking
 * 4. Print screen detection and blocking
 * 5. Browser DevTools detection
 * 
 * Note: These are deterrents, not absolute security. Determined users with
 * physical camera access or OS-level screenshot tools can still capture content.
 * 
 * Best used in combination with:
 * - Server-side watermarking
 * - Audit logging of sensitive data access
 * - User agreement/terms of service
 */

interface ScreenshotBlockerProps {
  /**
   * Enable screenshot blocking (default: true)
   */
  enabled?: boolean;
  
  /**
   * Show warning message when screenshot attempt is detected
   */
  showWarnings?: boolean;
  
  /**
   * Custom warning message
   */
  warningMessage?: string;
  
  /**
   * Block print functionality
   */
  blockPrint?: boolean;
  
  /**
   * Block canvas/WebGL capture
   */
  blockCanvas?: boolean;
  
  /**
   * Detect and warn about DevTools
   */
  detectDevTools?: boolean;
}

export function ScreenshotBlocker({
  enabled = true,
  showWarnings = true,
  warningMessage = "Screenshots are not allowed for security reasons.",
  blockPrint = true,
  blockCanvas = true,
  detectDevTools = false,
}: ScreenshotBlockerProps) {
  useEffect(() => {
    if (!enabled) return;

    // Apply CSS-based protection to body
    const applyProtection = () => {
      document.body.classList.add("screenshot-protected");
    };

    // Block keyboard shortcuts for screenshots
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Print Screen key
      if (e.key === "PrintScreen") {
        e.preventDefault();
        if (showWarnings) {
          console.warn(warningMessage);
        }
        return;
      }

      // Common screenshot shortcuts
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      
      if (isMac) {
        // macOS: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
        if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
          e.preventDefault();
          if (showWarnings) {
            console.warn(warningMessage);
          }
        }
      } else {
        // Windows/Linux: Win+Shift+S, Win+PrintScreen
        if ((e.metaKey || e.key === "Meta") && (e.shiftKey || e.key === "PrintScreen")) {
          e.preventDefault();
          if (showWarnings) {
            console.warn(warningMessage);
          }
        }
      }
    };

    // Block print functionality
    const handleBeforePrint = (e: Event): void => {
      if (blockPrint) {
        e.preventDefault();
        if (showWarnings) {
          alert(warningMessage);
        }
      }
    };

    // Block canvas capture
    const blockCanvasCapture = () => {
      if (!blockCanvas) return;

      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

      // Override toDataURL
      HTMLCanvasElement.prototype.toDataURL = function (...args) {
        if (showWarnings) {
          console.warn("Canvas capture blocked:", warningMessage);
        }
        // Return a blank canvas
        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        return originalToDataURL.apply(canvas, args);
      };

      // Override toBlob
      HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
        if (showWarnings) {
          console.warn("Canvas capture blocked:", warningMessage);
        }
        // Return a blank canvas blob
        const canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        return originalToBlob.call(canvas, callback, ...args);
      };

      // Override getImageData
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        if (showWarnings) {
          console.warn("Canvas data extraction blocked:", warningMessage);
        }
        // Return blank image data
        const [_x, _y, width, height] = args;
        return new ImageData(width, height);
      };

      return () => {
        // Restore original methods on cleanup
        HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
        HTMLCanvasElement.prototype.toBlob = originalToBlob;
        CanvasRenderingContext2D.prototype.getImageData = originalGetImageData;
      };
    };

    // DevTools detection (basic)
    const detectDevToolsOpen = () => {
      if (!detectDevTools) return;

      const threshold = 160;
      let devToolsOpen = false;

      const checkDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
          if (!devToolsOpen && showWarnings) {
            console.warn("Developer tools detected. Screenshot protection is active.");
            devToolsOpen = true;
          }
        } else {
          devToolsOpen = false;
        }
      };

      const interval = setInterval(checkDevTools, 1000);
      return () => clearInterval(interval);
    };

    // Block context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Apply all protections
    applyProtection();
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeprint", handleBeforePrint);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);

    const cleanupCanvas = blockCanvasCapture();
    const cleanupDevTools = detectDevToolsOpen();

    // Cleanup
    return () => {
      document.body.classList.remove("screenshot-protected");
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeprint", handleBeforePrint);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      
      if (cleanupCanvas) cleanupCanvas();
      if (cleanupDevTools) cleanupDevTools();
    };
  }, [enabled, showWarnings, warningMessage, blockPrint, blockCanvas, detectDevTools]);

  return null;
}
