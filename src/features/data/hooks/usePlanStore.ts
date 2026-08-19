import { create } from "zustand";

export interface ActivePlan {
    plan_id: number;
    plan_name: string;
    description: string;
    start_date: string;
    end_date: string;
    allowed_providers: string[];
    allowed_sensors: Record<string, string[]>;
    services: string[];
    is_active: boolean;
    is_currently_valid: boolean;
    assigned_at: string;
}

interface PlanStore {
    plan: ActivePlan | null;
    setPlan: (plan: ActivePlan) => void;
    clearPlan: () => void;
}

export const usePlanStore = create<PlanStore>((set) => ({
    plan: null,

    setPlan: (plan) =>
        set({
            plan,
        }),

    clearPlan: () =>
        set({
            plan: null,
        }),
}));
