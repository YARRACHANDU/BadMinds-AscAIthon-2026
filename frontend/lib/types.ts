export interface RoomState {
  locationId: string;
  locationName: string;
  peopleCount: number;
  detectedObjects: string[];
  roomStatus: "Empty" | "Active" | "Idle";
  safetyStatus: "Secure" | "Warning" | "Violation";
  lastUpdated: string;
}

export type AlertSeverity = "info" | "warning" | "danger";

export type AlertCategory = "safety" | "security" | "energy" | "system";

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  timestamp: string;
  resolved: boolean;
}

export interface ActionLog {
  id: string;
  type: "system" | "automation" | "alert" | "ticket";
  message: string;
  timestamp: string;
  details?: string;
}
