export interface AgentOutput {
  observation: string;
  reasoning: string;
  confidence: number;
  decision: string;
  recommendedAction: string;
}

export interface AgentsState {
  security: AgentOutput;
  energy: AgentOutput;
  safety: AgentOutput;
  facility: AgentOutput;
}

export interface DeviceStates {
  lights: boolean;
  fan: boolean;
  alarm: boolean;
}

export interface RoomState {
  roomId: string;
  roomName: string;
  cameraId: string;
  peopleCount: number;
  detectedObjects: string[];
  occupancyStatus: "Occupied" | "Empty";
  roomEmptySince: string | null;
  lastActivityTime: string | null;
  lastUpdated: string;
  confidence: number;
  deviceStates: DeviceStates;
  agents: AgentsState;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  statusSummary: string;
}

export interface OperationalMetrics {
  occupancyRate: number;
  securityScore: number;
  safetyScore: number;
  energyEfficiencyScore: number;
  aiConfidenceAverage: number;
  incidentsToday: number;
  actionsExecuted: number;
  estimatedEnergySaved: number;
}

export interface ActionItem {
  id: string;
  roomId: string;
  type: string;
  status: "pending" | "executing" | "completed" | "failed";
  timestamp: string;
  details: string;
}

export interface IncidentItem {
  id: string;
  roomId: string;
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "active" | "resolved";
  timestamp: string;
  resolvedAt: string | null;
}

export interface TimelineEvent {
  id: string;
  roomId: string;
  type: "info" | "warning" | "critical" | "action";
  message: string;
  referenceId: string | null;
  timestamp: string;
}

export interface PredictiveInsight {
  id: string;
  category: "utilization" | "energy" | "security" | "safety";
  title: string;
  message: string;
  impact: string;
  confidence: number;
}
