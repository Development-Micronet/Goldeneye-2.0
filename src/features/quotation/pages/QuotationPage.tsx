import React from "react";

export const QuotationPage: React.FC = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-8 shadow-lg">
        <h2 className="mb-3 text-2xl font-bold text-gray-800">Quotations</h2>
        <p className="text-sm text-gray-500">Create, view, and manage client quotations here.</p>
      </div>
    </div>
  );
};
