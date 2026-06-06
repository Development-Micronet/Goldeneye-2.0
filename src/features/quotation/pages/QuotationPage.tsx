import React from "react";

export const QuotationPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Quotations</h2>
        <p className="text-sm text-gray-500">
          Create, view, and manage client quotations here.
        </p>
      </div>
    </div>
  );
};
