export const ArchiveProductCardSkeleton = () => {
  return (
    <div className="animate-pulse bg-white">
      <div className="flex gap-2 p-2.5">
        {/* Thumbnail */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-slate-200">
          <div className="absolute top-1 left-1 h-4 w-4 rounded bg-slate-300" />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            {/* Title */}
            <div className="mb-2 h-4 w-36 rounded bg-slate-200" />

            {/* Date */}
            <div className="mb-3 h-3 w-48 rounded bg-slate-200" />

            {/* Metadata */}
            <div className="flex gap-3">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-3 w-16 rounded bg-slate-200" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-6 rounded bg-slate-200" />
            <div className="h-6 w-6 rounded bg-slate-200" />
            <div className="h-6 w-6 rounded bg-slate-200" />
            <div className="h-6 w-6 rounded bg-slate-200" />
            <div className="h-6 w-6 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
};
