import React, { use, useEffect } from "react";
import { AoiDrawIcon } from "../icons/AoiDrawIcon";
import { FetchAttempt } from "../api/Tasking.service";
import { useSelectedAOIStore } from "../../../hooks/useSelectedAOIStore";
import { useLayersStore } from "../../../../../store/useLayersStore";


export const TaskingMenu: React.FC = () => {
  const { map } = useSelectedAOIStore();
  const layers = useLayersStore((state) => state.layers);
  const sensor = ["All", "PLEIADES", "SPOT", "PLEIADES NEO"]
  const IncidenceAngle = ["≤ 50 ", "≤ 30 ", "≤ 20"]
  const CloudCoverage = ["≤ 5 ", "≤ 10 ", "≤ 20"]
  const AcquisitionMode = ["MONO", "STEREO", "TRISTEREO"]
  const payload = {
  acquisitionStartDate: "2026-10-01T00:00:00Z",
  acquisitionEndDate: "2026-10-30T00:00:00Z",
  missions: ["PLEIADESNEO"],
  progTypeNames: ["ONENOW"],
  acquisitionMode: "MONO",
  maxCloudCover: 20,
  maxIncidenceAngle: 30,
  aoi: {
    type: "Polygon",
    coordinates: [
      [
        [75.80, 25.20],
        [75.80, 25.10],
        [75.90, 25.10],
        [75.90, 25.20],
        [75.80, 25.20],
      ],
    ],
  },
};

useEffect(() => {
  const data = async () => {
    try {
      const data = await FetchAttempt(payload);
      console.log(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
  data();
}, [])
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center select-none">
      <p className="text-primary mb-4 max-w-[240px] text-sm font-semibold sm:text-base">
        Please Create or Select AOI Before Tasking.
      </p>
      <div className="border-primary bg-primary/10 hover:bg-primary/30 flex h-12 w-12 cursor-pointer items-center justify-center rounded border shadow-sm transition-colors">
        <AoiDrawIcon />
      </div>
    </div>
  );
};
