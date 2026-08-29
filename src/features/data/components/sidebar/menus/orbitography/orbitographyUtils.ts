export interface OrbitPass {
  id: string;
  name: string;
  date: string;
  time: string;
}

// Generate 132 mock results based on date range
export const generateMockOrbits = (startDate: string, endDate: string): OrbitPass[] => {
  const list: OrbitPass[] = [];
  const constellations = ["PHR-1A", "SPOT-6", "PHR-1B", "PHR-1A", "SPOT-6", "PHR-1B", "PHR-1A"];

  let start = new Date(startDate || "2026-08-08");
  let end = new Date(endDate || "2026-08-10");
  if (isNaN(start.getTime())) start = new Date("2026-08-08");
  if (isNaN(end.getTime())) end = new Date("2026-08-10");

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const itemsPerDay = Math.ceil(132 / Math.max(1, diffDays));
  let itemIndex = 0;

  for (let d = 0; d < diffDays; d++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + d);

    const dateStr = currentDay
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");

    for (let i = 0; i < itemsPerDay; i++) {
      if (list.length >= 132) break;

      const name = constellations[itemIndex % constellations.length];
      const startHour = Math.floor((i * 24) / itemsPerDay);
      const startMin = Math.floor((((i * 24) / itemsPerDay) % 1) * 60);
      const endHour = (startHour + (i % 2 === 0 ? 0 : 1)) % 24;
      const endMin = (startMin + (i % 2 === 0 ? 39 : 49)) % 60;

      const pad = (num: number) => String(num).padStart(2, "0");
      const timeStr = `${pad(startHour)}:${pad(startMin)} - ${pad(endHour)}:${pad(endMin)}`;

      list.push({
        id: `pass-${d}-${i}`,
        name,
        date: dateStr,
        time: timeStr,
      });

      itemIndex++;
    }
  }

  while (list.length < 132) {
    const dateStr = start
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");

    const name = constellations[list.length % constellations.length];
    list.push({
      id: `pad-${list.length}`,
      name,
      date: dateStr,
      time: "00:00 - 00:39",
    });
  }

  return list;
};

export const getBadgeStyle = (name: string) => {
  switch (name) {
    case "PHR-1A":
      return "bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200 px-2 py-0.5 rounded font-sans";
    case "PHR-1B":
      return "bg-green-100 text-green-700 text-[10px] font-bold border border-green-200 px-2 py-0.5 rounded font-sans";
    case "SPOT-6":
    case "SPOT-7":
      return "bg-pink-100 text-pink-700 text-[10px] font-bold border border-pink-200 px-2 py-0.5 rounded font-sans";
    default:
      return "bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 px-2 py-0.5 rounded font-sans";
  }
};
