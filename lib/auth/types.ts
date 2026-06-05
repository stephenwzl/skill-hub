export type UserRole = "admin" | "user";
export type PlanType = "free" | "pro" | "enterprise";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: PlanType;
  apiKeyPrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface DomainOwner {
  domain: string;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
}

/** Plan feature limits */
export const PLAN_LIMITS: Record<PlanType, {
  maxSkills: number;
  maxTeamMembers: number;
  apiCallsPerDay: number;
  vectorSearchEnabled: boolean;
  compactEnabled: boolean;
  importEnabled: boolean;
}> = {
  free: {
    maxSkills: 50,
    maxTeamMembers: 1,
    apiCallsPerDay: 100,
    vectorSearchEnabled: true,
    compactEnabled: false,
    importEnabled: false,
  },
  pro: {
    maxSkills: 500,
    maxTeamMembers: 10,
    apiCallsPerDay: 5000,
    vectorSearchEnabled: true,
    compactEnabled: true,
    importEnabled: true,
  },
  enterprise: {
    maxSkills: Infinity,
    maxTeamMembers: Infinity,
    apiCallsPerDay: Infinity,
    vectorSearchEnabled: true,
    compactEnabled: true,
    importEnabled: true,
  },
};

export function isSelfHosted(): boolean {
  return process.env.SELF_HOSTED?.trim().toLowerCase() === "true";
}

export function getEffectivePlan(user: AuthUser | null): PlanType {
  if (isSelfHosted()) return "enterprise";
  return user?.plan ?? "free";
}
