import { Satellite } from "lucide-react";

export const History: React.FC = () => {
  return (
    <div className="font-inter flex h-full items-center justify-center p-3">
      <div className="border-primary/25 flex w-full max-w-sm flex-col items-center rounded-2xl border bg-white p-8 text-center shadow-[0_1px_10px_-6px_rgba(44,102,113,0.5)]">
        <div className="bg-primary-100 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-full">
          <Satellite size={24} />
        </div>

        <h3 className="font-mona text-primary text-base font-semibold">Historical Archive</h3>

        <p className="text-text-muted mt-2 text-sm">Historical archive data coming soon.</p>

        <span className="bg-primary-100 text-primary mt-4 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase">
          Coming Soon
        </span>
      </div>
    </div>
  );
};
