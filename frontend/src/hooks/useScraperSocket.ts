import { useEffect, useSyncExternalStore } from "react";
import { getSocket, subscribeToSocket } from "@/api/socket";

interface ScraperEvent {
  provider: string;
  runId: string;
  status?: string;
  chaptersAdded?: number;
  error?: string;
}

export type ScraperRunState = "idle" | "loading" | "done";
export type ScraperState = Record<string, ScraperRunState>;

let scraperState: ScraperState = {};
let scraperListeners: Array<() => void> = [];

function notifyScraperListeners() {
  scraperListeners.forEach((cb) => cb());
}

function subscribeToScraper(cb: () => void) {
  scraperListeners.push(cb);
  return () => {
    scraperListeners = scraperListeners.filter((l) => l !== cb);
  };
}

function getScraperState() {
  return scraperState;
}

export function useScraperSocket() {
  const socket = useSyncExternalStore(subscribeToSocket, getSocket, getSocket);

  useEffect(() => {
    if (!socket) return;

    const handleStarted = (data: ScraperEvent) => {
      scraperState = { ...scraperState, [data.provider]: "loading" };
      notifyScraperListeners();
    };

    const handleCompleted = (data: ScraperEvent) => {
      scraperState = { ...scraperState, [data.provider]: "done" };
      notifyScraperListeners();
      setTimeout(() => {
        scraperState = { ...scraperState, [data.provider]: "idle" };
        notifyScraperListeners();
      }, 3000);
    };

    const handleError = (data: ScraperEvent) => {
      scraperState = { ...scraperState, [data.provider]: "idle" };
      notifyScraperListeners();
    };

    socket.on("scraper:started", handleStarted);
    socket.on("scraper:completed", handleCompleted);
    socket.on("scraper:error", handleError);

    return () => {
      socket.off("scraper:started", handleStarted);
      socket.off("scraper:completed", handleCompleted);
      socket.off("scraper:error", handleError);
    };
  }, [socket]);

  return useSyncExternalStore(subscribeToScraper, getScraperState, getScraperState);
}
