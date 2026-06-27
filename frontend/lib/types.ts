export interface AgentOutput {
  observation: string;
  reasoning: string;
  confidence: number;
  decision: string;
  recommendedAction: string;
  ruleTriggered?: string;
  evidence?: string;
}

export interface EnergyAgentOutput {
  observation: string;
  reasoning: string;
  savingsEstimate: string;
  decision: string;
  recommendedAction: string;
  ruleTriggered?: string;
  evidence?: string;
}

export interface SafetyAgentOutput {
  observation: string;
  riskLevel: string;
  reasoning: string;
  decision: string;
  action: string;
  recommendedAction?: string;
  ruleTriggered?: string;
  evidence?: string;
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

export interface EnvironmentalState {
  temperature: number;
  humidity: number;
  airQuality: number;
  noiseLevel: number;
  lightingCondition: string;
  smokeDetected: boolean;
  waterLeakage: boolean;
  blockedExits: boolean;
  visibilityCondition: string;
  brightnessLevel?: number;
  illuminationScore?: number;
  motionActivity?: string;
  fanActivity?: string;
  energyEfficiencyState?: string;
  lightingStatus?: string;
  roomState?: string;
}

export interface PeopleAsset {
  count: number;
  crowdingState: string;
  movementPatterns: string;
  presenceDurationMin: number;
}

export interface SafetyAsset {
  type: string;
  status: string;
}

export interface InfrastructureAsset {
  type: string;
  doorsCount: number;
  windowsCount: number;
  exitsCount: number;
}

export interface UniversalAssetModel {
  people: PeopleAsset;
  safetyAssets: SafetyAsset[];
  infrastructure: InfrastructureAsset;
}

export interface OwnerDetails {
  name: string;
  email: string;
  role: string;
}

export interface Owners {
  primary?: OwnerDetails | null;
  secondary?: OwnerDetails | null;
  escalation?: OwnerDetails | null;
  emergency?: OwnerDetails | null;
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
  environmental?: EnvironmentalState;
  assets?: UniversalAssetModel;
  owners?: Owners | null;
  floorName?: string;
  buildingId?: string | null;
  floorId?: string | null;
  occupancyConfidence?: number;
  temporalHistory?: Array<{
    timestamp: string;
    peopleCount: number;
    detectedObjects: string[];
    frameConfidence: number;
  }>;
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
  energySavedTodayINR: number;
  energySavedThisWeekINR: number;
  energySavedThisMonthINR: number;
  projectedAnnualSavingsINR: number;
  operationalEfficiencyScore: number;
  incidentReductionPercent: number;
  automationSuccessRate: number;
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
  agentResponsible?: string;
  reasoning?: string;
  impact?: string;
  confidence?: number;
  evidenceUsed?: string;
  expectedImpact?: string;
  sourceIncidentId?: string;
  sourceIncidentTitle?: string;
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
  escalationLevel?: number;
  assignedUser?: string;
  building?: string;
  recommendedAction?: string;
  evidence?: {
    detectedObjects: string[];
    detectionConfidence: number;
    frameCount: string;
    occupancyConfidence: number;
    sourceCamera: string;
    sourceRoom: string;
  };
}

export interface TimelineEvent {
  id: string;
  roomId: string;
  roomName?: string | null;
  type: "info" | "warning" | "critical" | "action";
  message: string;
  referenceId: string | null;
  timestamp: string;
  snapshot?: {
    peopleCount?: number;
    occupancyStatus?: string;
    riskLevel?: string;
    deviceStates?: Record<string, boolean>;
    agentDecision?: string;
    agentReasoning?: string;
  } | null;
}

export interface PredictiveInsight {
  id: string;
  category: "utilization" | "energy" | "security" | "safety";
  title: string;
  message: string;
  impact: string;
  confidence: number;
}

export interface Prediction {
  id: string;
  category: "utilization" | "energy" | "security" | "safety";
  roomId: string;
  roomName: string;
  prediction: string;
  confidence: number;
  expectedTimeMinutes: number;
  recommendedAction: string;
}

export interface HealthScoreRoom {
  roomId: string;
  roomName: string;
  facility: string;
  score: number;
  grade: string;
  status: "Healthy" | "Warning" | "Critical";
  factors: string[];
  riskLevel: string;
  activeIncidentCount: number;
}

export interface HealthScoreBuilding {
  name: string;
  score: number;
  grade: string;
  status: "Healthy" | "Warning" | "Critical";
  roomCount: number;
  criticalRooms: number;
  rooms: HealthScoreRoom[];
}

export interface HealthScores {
  generatedAt: string;
  campus: {
    score: number;
    grade: string;
    status: string;
    totalRooms: number;
    totalActiveIncidents: number;
    criticalIncidents: number;
    healthyRooms: number;
    warningRooms: number;
    criticalRooms: number;
  };
  buildings: HealthScoreBuilding[];
  rooms: HealthScoreRoom[];
}

export interface ComplianceRuleResult {
  ruleId: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  passed: boolean;
  violation: string | null;
}

export interface ComplianceRoomResult {
  roomId: string;
  roomName: string;
  facility: string;
  complianceScore: number;
  passedRules: number;
  totalRules: number;
  violations: ComplianceRuleResult[];
  criticalViolations: number;
  status: "Compliant" | "Partial" | "Non-Compliant";
}

export interface ComplianceReport {
  auditedAt: string;
  overallComplianceScore: number;
  status: string;
  summary: {
    totalRoomsAudited: number;
    compliantRooms: number;
    partialRooms: number;
    nonCompliantRooms: number;
    totalChecks: number;
    totalPassed: number;
    totalFailed: number;
  };
  rules: Array<{ id: string; title: string; category: string; severity: string }>;
  rooms: ComplianceRoomResult[];
}

export interface SOPTemplate {
  key: string;
  name: string;
  description: string;
  stepCount: number;
  steps: Array<{ step: number; action: string; delayMs: number; description: string }>;
}

export interface SOPExecution {
  executionId: string;
  sopName: string;
  templateName: string;
  spaceId: string;
  triggeredBy: string;
  incidentId: string | null;
  startTime: string;
  status: "running" | "completed" | "aborted";
  completedSteps: number[];
  pendingSteps: number[];
  totalSteps: number;
  completedAt?: string;
}

export interface DailyReport {
  reportTitle: string;
  generatedAt: string;
  reportDate: string;
  period: string;
  executiveSummary: {
    campusHealthScore: number;
    campusStatus: string;
    totalRoomsMonitored: number;
    currentOccupancy: string;
    overallRiskPosture: string;
  };
  energy: {
    savedTodayINR: number;
    savedThisWeekINR: number;
    projectedAnnualINR: number;
    carbonReducedKg: number;
    equivalentTreesSaved: number;
    wasteRoomsCount: number;
    automatedShutdowns: number;
  };
  incidents: {
    todayTotal: number;
    todayResolved: number;
    todayActive: number;
    currentlyActive: number;
    bySeverity: Record<string, number>;
    averageResolutionTimeMin: number;
  };
  actions: {
    totalToday: number;
    completed: number;
    failed: number;
    automationSuccessRate: number;
    topActionTypes: Array<{ type: string; count: number }>;
  };
  occupancy: {
    currentRate: number;
    occupiedSpaces: string[];
    emptyWithActiveDevices: string[];
  };
  topRisks: Array<{ roomName: string; facility: string; riskLevel: string }>;
  recommendations: Array<{ priority: string; category: string; action: string; estimatedSaving: string }>;
}

export interface MemoryPatterns {
  generatedAt: string;
  mostActiveRooms: Array<{ roomId: string; roomName: string; facility: string; utilizationRate: number; averageOccupancy: number }>;
  frequentIncidentRooms: Array<{ roomName: string; totalIncidents: number; bySeverity: Record<string, number> }>;
  energyWasteHotspots: Array<{ roomId: string; roomName: string; facility: string; lightsOn: boolean; fanOn: boolean; emptyDuration: string }>;
  peakRiskPeriods: Array<{ hour: string; count: number }>;
  peakRiskHour: number;
  automationEffectiveness: { successRate: number; totalActionsAnalyzed: number; completedActions: number; failedActions: number };
  longTermInsights: string[];
}
