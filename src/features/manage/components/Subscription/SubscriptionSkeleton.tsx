const SubscriptionSkeleton = () => {
  return (
    <div className="p-6 animate-pulse">

      {/* Provider Dropdown */}
      <div className="h-10 w-[420px] bg-gray-200 rounded-md mb-6" />

      {/* Heading */}
      <div className="h-7 w-52 bg-gray-200 rounded mb-5" />

      {/* Card */}
      <div className="border border-gray-200 rounded-md bg-white p-6">

        {[1, 2, 3].map((item, index) => (
          <div key={item}>
            {/* Provider Name */}
            <div className="h-7 w-32 bg-gray-200 rounded mb-5" />

            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>

            {/* Type */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-12 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-200 rounded" />
            </div>

            {/* URL */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-10 bg-gray-200 rounded" />
              <div className="h-4 w-[420px] bg-gray-200 rounded" />
            </div>

            {/* Service Info */}
            <div className="mb-6">
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />

              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
              </div>
            </div>

            {index !== 2 && (
              <div className="border-b border-gray-200 my-6" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionSkeleton;