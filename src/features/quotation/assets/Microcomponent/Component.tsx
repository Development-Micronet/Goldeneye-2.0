import React from "react";
import { FiInfo, FiAlertCircle, FiX, FiCheck } from "react-icons/fi";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

interface SectionDividerProps {
  icon: any;
  title: string;
  subtitle?: string;
}

interface PillProps {
  children: React.ReactNode;
  onRemove?: () => void;
  color?: "primary" | "green" | "amber";
}

interface StepBarProps {
  step: number;
  steps: Array<{ title: string; icon: any }>;
  onStepClick: (stepIndex: number) => void;
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="relative group inline-block">
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-700 cursor-pointer">
          {label}

          {required && (
            <span className="text-red-500 text-[10px]">*</span>
          )}

          {hint && (
            <span
              title={hint}
              className="text-gray-400 cursor-help"
            >
              <FiInfo className="w-3 h-3" />
            </span>
          )}
        </label>

        <span
          className="absolute left-0 -top-6 z-50 
                     hidden group-hover:block
                     bg-black text-white text-[10px] 
                     px-2 py-1 rounded shadow-lg 
                     whitespace-nowrap"
        >
          {label}
        </span>
      </div>

      {children}

      {error && (
        <span className="flex items-center gap-1 text-[11px] text-red-500 animate-[fadeIn_0.2s_ease]">
          <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export function SectionDivider({ icon: Icon, title, subtitle }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#2c6671]/10 text-[#2c6671]">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-[#2c6671]">{title}</div>
        {subtitle && (
          <div className="text-[11px] text-gray-500 truncate">{subtitle}</div>
        )}
      </div>
      <div className="flex-1 h-px bg-gray-200 hidden sm:block" />
    </div>
  );
}

export function Pill({ children, onRemove, color = "primary" }: PillProps) {
  const colors = {
    primary: "bg-[#2c6671]/10 text-[#2c6671] border-[#2c6671]/20",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${colors[color]} transition-all`}
    >
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-current/20 hover:bg-current/40 transition-colors text-inherit opacity-70 hover:opacity-100"
        >
          <FiX className="w-2 h-2" />
        </button>
      )}
    </span>
  );
}

export function StepBar({ step, steps, onStepClick }: StepBarProps) {
  return (
    <div className="mb-4 flex items-stretch gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-xs">
      {steps.map((s, i) => {
        const active = i === step;
        const done = i < step;
        const Icon = s.icon;
        return (
          <button
            key={i}
            onClick={() => onStepClick(i)}
            className={`
              group relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5
              text-[12px] transition-all duration-200
              ${active ? "bg-[#2c6671] text-white shadow-md font-bold" : ""}
              ${done ? "text-[#2c6671] bg-[#2c6671]/10 hover:bg-[#2c6671]/15 font-semibold" : ""}
              ${!active && !done ? "text-gray-600 hover:bg-gray-100 font-medium" : ""}
            `}
          >
            <span
              className={`
              inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200
              ${active ? "bg-white/20 text-white" : ""}
              ${done ? "bg-[#2c6671] text-white" : ""}
              ${!active && !done ? "bg-gray-200 text-gray-500" : ""}
            `}
            >
              {done ? (
                <FiCheck className="w-3 h-3 text-white" />
              ) : (
                <Icon className="w-3 h-3" />
              )}
            </span>
            <span className="hidden sm:inline truncate">{s.title}</span>
            <span className="sm:hidden">{i + 1}</span>
            {active && (
              <span className="absolute bottom-1 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-white/70 animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
}
