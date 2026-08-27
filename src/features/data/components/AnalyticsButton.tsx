import { FiBarChart2 } from "react-icons/fi";

const AnalyticsButton = () => {
    return (
        <button
            type="button"
            className="absolute bottom-20 left-1/2 z-50 flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-700 shadow-lg transition hover:bg-cyan-50"
        >
            <FiBarChart2 size={14} />
            <span>Analytics</span>
        </button>
    );
};

export default AnalyticsButton;
