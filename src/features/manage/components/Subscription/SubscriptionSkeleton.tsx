const SubscriptionSkeleton = () => {
  return (
    <div className="animate-pulse p-6">
      {/* Provider Dropdown */}
      <div className="mb-6 h-10 w-[420px] rounded-md bg-gray-200" />

      {/* Heading */}
      <div className="mb-5 h-7 w-52 rounded bg-gray-200" />

      {/* Card */}
      <div className="rounded-md border border-gray-200 bg-white p-6">
        {[1, 2, 3].map((item, index) => (
          <div key={item}>
            {/* Provider Name */}
            <div className="mb-5 h-7 w-32 rounded bg-gray-200" />

            {/* Status */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>

            {/* Type */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-12 rounded bg-gray-200" />
              <div className="h-4 w-28 rounded bg-gray-200" />
            </div>

            {/* URL */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-4 w-10 rounded bg-gray-200" />
              <div className="h-4 w-[420px] rounded bg-gray-200" />
            </div>

            {/* Service Info */}
            <div className="mb-6">
              <div className="mb-3 h-4 w-24 rounded bg-gray-200" />

              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="h-4 w-5/6 rounded bg-gray-200" />
              </div>
            </div>

            {index !== 2 && <div className="my-6 border-b border-gray-200" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionSkeleton;
