export interface AgentOutput {
  observation: string;
  reasoning: string;
  confidence: number;
  decision: string;
  recommendedAction: string;
}

export interface EnergyAgentOutput {
  observation: string;
  reasoning: string;
  savingsEstimate: string;
  decision: string;
  recommendedAction: string;
}

export interface SafetyAgentOutput {
  observation: string;
  riskLevel: string;
  reasoning: string;
  decision: string;
  action: string;
}

export interface FacilityAgentOutput {
  observation: string;
  facilityHealthScore: number;
  recommendation: string;
  priority: string;
}

export interface AgentsState {
  security: AgentOutput;
  energy: EnergyAgentOutput;
  safety: SafetyAgentOutput;
  facility: FacilityAgentOutput;
}

export interface DeviceStates {
  lights: boolean;
  fan: boolean;
  alarm: boolean;
  doorLocked: boolean;
}

export interface RoomState {
  roomId: string;
  roomName: string;
  facility: string;
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
  // Business ROI metrics
  energySavedTodayINR: number;
  energySavedThisWeekINR: number;
  energySavedThisMonthINR: number;
  projectedAnnualSavingsINR: number;
  operationalEfficiencyScore: number;
  incidentReductionPercent: number;
  automationSuccessRate: number;
  // ESG metrics
  carbonReducedKg: number;
  equivalentTreesSaved: number;
  environmentalImpactScore: number;
  sustainabilityIndex: number;
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
