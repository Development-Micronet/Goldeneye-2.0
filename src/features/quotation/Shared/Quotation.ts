import { FiFileText, FiPackage, FiImage, FiEye } from "react-icons/fi";
import type { IconType } from "react-icons";
// import header1 from "../../assets/images/micronetsolutionheader.png";
// // import footer1 from "../../assets/images/micronetsolutionsfooter.png";
// import header2 from "../../assets/images/micronetsolutionllpheader.png";
// // import footer2 from "../../assets/images/micronetspacetechllpfooter.png";
// import header3 from "../../assets/images/micronetspacetechdwcllcheader.png";
// // import footer3 from "../../assets/images/micronetspacetechdwcllcfooter.png";

export const CLS: {
  label: string;
  input: string;
  select: string;
  sectionTitle: string;
  divider: string;
  card: string;
  badge: string;
} = {
  label: "block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1",
  input:
    "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-[#2c6671] focus:outline-none focus:ring-1 focus:ring-[#2c6671] disabled:bg-gray-100 disabled:text-gray-400 shadow-xs transition-colors",
  select:
    "w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-[#2c6671] focus:outline-none focus:ring-1 focus:ring-[#2c6671] disabled:bg-gray-100 disabled:text-gray-400 shadow-xs transition-colors",
  sectionTitle:
    "text-xs font-black uppercase tracking-widest text-[#2c6671] flex items-center gap-1.5",
  divider: "border-t border-gray-200 my-2.5",
  card: "rounded-xl border border-gray-200 bg-white p-3.5 mt-2.5 shadow-xs",
  badge:
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#2c6671]/10 text-[#2c6671]",
};
export const TODAY: string = new Date().toISOString().split("T")[0];
export const COMPANY_HEADERS = [
  {
    id: 1,
    match: "MICRONET SOLUTIONS",
    contactPerson: "Manik Kotarwar",
    email: "manik@micronetsolutions.in",
    address: "Bunglow No. 80, Khare Tarkunde Nagar, Gittikhadan, Nagpur 440013",
  },
  {
    id: 2,
    match: "MICRONET SPACETECH LLP",
    contactPerson: "Devendra Gaidhane",
    email: "devendra@spacetechindia.in",
    address: "Plot No. 25, Friends Colony, Katol Road, Nagpur 440013",
  },
  {
    id: 3,
    match: "MICRONET SPACETECH DWC-LLC",
    contactPerson: "Amrit Walia",
    email: "sales@spacetechdubai.com",
    address: "Dubai South Business Centre, Building C, 3rd Floor, PO Box 390667, Dubai, UAE",
  },
];
export type Step = {
  title: string;
  shortTitle: string;
  icon: IconType;
  desc: string;
};

export const STEPS: Step[] = [
  {
    title: "Details and Items",
    shortTitle: "Details",
    icon: FiFileText,
    desc: "Quotation metadata & client info",
  },
  // { title: "Line Items", shortTitle: "Items",   icon: FiPackage,   desc: "Products, pricing & GST configuration"  },
  {
    title: "Images & Terms",
    shortTitle: "Images & T/C",
    icon: FiImage,
    desc: "Upload images, KML files, and manage terms & conditions",
  },
  {
    title: "Preview",
    shortTitle: "Preview",
    icon: FiEye,
    desc: "Review, finalize & download PDF",
  },
];

export const UNITS: string[] = ["Sqkm", "SAR"];

export type SpecificationValue = string | number | boolean | Record<string, any>;
export const DEFAULT_SPECIFICATION: Record<string, SpecificationValue> = {
  "Data Generation Methodology": "InSAR Interferometry",
  "Coverage Availability": "Global",
  "File Format": "GeoTIFF",
  "Data Type": "32 Bit, floating",
  "NoData Value": -32767,
  Projection: "UTM",
  "Pixel Spacing": "5m",
  // "Vertical Accuracy": { Absolute: "2-4 m (90% linear error)", Relative: "<2m (slope ≤20%), <4m (slope >20%)" },
  Vintage: 2015,
};

export const TECHNICAL_SPECIFICATION: Record<string, Record<string, SpecificationValue>> = {
  "WorldDEM NEO -DSM, DTM and Bundle": {
    "Sensor Source": "TerraSAR-X and TanDEM-X",
    "Sensor Type": "Radar (SAR)",
    "Data Generation Methodology": "InSAR Interferometry",
    "Coverage Availability": "Global",
    "File Format": "GeoTIFF",
    "Pixel Spacing": "2m (can be Refined to 0.5m if required)",
    // "Vertical Accuracy": { Absolute: "<1.4 m (90% linear error)", Relative: "<2m (slope ≤20%), <4m (slope >20%)" },
    Vintage: 2022,
  },
};

// ─── Session Storage Helpers ────────────────────────────────────────────
export function parseSessionObject<T extends Record<string, any>>(
  key: string,
  fallback: T = {} as T,
): T {
  try {
    const raw = sessionStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function parseSessionValue<T = any>(key: string, fallback: T | null = null): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Filter Helpers ─────────────────────────────────────────────────────
export function parseRange(val: unknown): any[] | null {
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ─── Tailwind Classes ────────────────────────────────────────────────────
export const inputCls: string =
  "w-full rounded-lg border border-light-400 bg-light-50 px-3 py-2 text-[13px] text-primary-800 " +
  "placeholder-light-600 outline-none transition-all duration-150 " +
  "focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:bg-white " +
  "hover:border-light-500 disabled:opacity-50 disabled:cursor-not-allowed read-only:bg-light-200 read-only:text-light-700";

export const selectCls: string =
  inputCls +
  " cursor-pointer appearance-none pr-8 bg-[image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236f8282' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_10px_center]";

// ─── Validation Functions ───────────────────────────────────────────────
export function validateStep0({
  to_company,
  from_company,
  reference_date,
}: {
  to_company: string;
  from_company: string;
  reference_date?: string | null;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!to_company || !to_company.trim()) errors.to_company = "Client company is required";
  if (!from_company || !from_company.trim()) errors.from_company = "From company is required";
  if (!reference_date) errors.reference_date = "Date is required";
  return errors;
}

export function validateStep1({
  items,
}: {
  items?: Record<string, any> | any[];
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!items || (typeof items === "object" && Object.keys(items).length === 0))
    errors.items = "Add at least one line item";
  return errors;
}

export const Imagesfromlocal: string[] = (() => {
  try {
    const raw = localStorage.getItem("initialImages");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

export const GEO_DATA: Record<string, Record<string, string[]>> = {
  India: {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool"],
    "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
    Assam: ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
    Bihar: ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
    Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Durg"],
    Delhi: ["New Delhi", "Dwarka", "Rohini", "Janakpuri"],
    Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
    Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
    Haryana: ["Faridabad", "Gurgaon", "Panipat", "Ambala", "Karnal"],
    "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Dharamsala"],
    Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
    Karnataka: ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi"],
    Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane", "Solapur"],
    Manipur: ["Imphal", "Thoubal", "Bishnupur"],
    Meghalaya: ["Shillong", "Tura", "Jowai"],
    Mizoram: ["Aizawl", "Lunglei", "Champhai"],
    Nagaland: ["Kohima", "Dimapur", "Mokokchung"],
    Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"],
    Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Chandigarh"],
    Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner", "Ajmer"],
    Sikkim: ["Gangtok", "Namchi", "Gyalshing"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
    Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Khammam"],
    Tripura: ["Agartala", "Dharmanagar", "Udaipur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Prayagraj", "Noida", "Ghaziabad"],
    Uttarakhand: ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
    "West Bengal": ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Howrah"],
  },
  "United States": {
    California: ["Los Angeles", "San Francisco", "San Diego", "Sacramento", "San Jose"],
    Texas: ["Houston", "Dallas", "Austin", "San Antonio", "Fort Worth"],
    "New York": ["New York City", "Buffalo", "Rochester", "Albany", "Syracuse"],
    Florida: ["Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale"],
    Illinois: ["Chicago", "Aurora", "Rockford", "Joliet", "Naperville"],
    Washington: ["Seattle", "Spokane", "Tacoma", "Bellevue", "Olympia"],
    "New Jersey": ["Newark", "Jersey City", "Paterson", "Elizabeth", "Trenton"],
    Georgia: ["Atlanta", "Augusta", "Columbus", "Savannah", "Athens"],
  },
  "United Kingdom": {
    England: ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Sheffield", "Bristol"],
    Scotland: ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness"],
    Wales: ["Cardiff", "Swansea", "Newport", "Wrexham"],
    "Northern Ireland": ["Belfast", "Derry", "Lisburn", "Newry"],
  },
  Canada: {
    Ontario: ["Toronto", "Ottawa", "Mississauga", "Brampton", "Hamilton"],
    "British Columbia": ["Vancouver", "Victoria", "Kelowna", "Abbotsford"],
    Quebec: ["Montreal", "Quebec City", "Laval", "Gatineau"],
    Alberta: ["Calgary", "Edmonton", "Red Deer", "Lethbridge"],
    Manitoba: ["Winnipeg", "Brandon", "Steinbach"],
  },
  Australia: {
    "New South Wales": ["Sydney", "Newcastle", "Wollongong", "Canberra"],
    Victoria: ["Melbourne", "Geelong", "Ballarat", "Bendigo"],
    Queensland: ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville"],
    "Western Australia": ["Perth", "Fremantle", "Bunbury", "Albany"],
    "South Australia": ["Adelaide", "Mount Gambier", "Whyalla"],
  },
  Germany: {
    Bavaria: ["Munich", "Nuremberg", "Augsburg", "Regensburg"],
    "North Rhine-Westphalia": ["Cologne", "Düsseldorf", "Dortmund", "Essen", "Bonn"],
    "Baden-Württemberg": ["Stuttgart", "Mannheim", "Karlsruhe", "Freiburg"],
    Berlin: ["Berlin"],
    Hamburg: ["Hamburg"],
  },
  France: {
    "Île-de-France": ["Paris", "Versailles", "Saint-Denis", "Boulogne-Billancourt"],
    "Provence-Alpes-Côte d'Azur": ["Marseille", "Nice", "Toulon", "Aix-en-Provence"],
    "Auvergne-Rhône-Alpes": ["Lyon", "Grenoble", "Clermont-Ferrand", "Saint-Étienne"],
    "Nouvelle-Aquitaine": ["Bordeaux", "Limoges", "Poitiers", "La Rochelle"],
  },
  Singapore: {
    "Central Region": ["Singapore City", "Orchard", "Marina Bay", "Clarke Quay"],
    "East Region": ["Tampines", "Bedok", "Pasir Ris", "Changi"],
    "West Region": ["Jurong", "Clementi", "Buona Vista", "Tuas"],
  },
  "United Arab Emirates": {
    "Abu Dhabi": ["Abu Dhabi City", "Al Ain", "Ruwais"],
    Dubai: ["Dubai City", "Deira", "Bur Dubai", "Jumeirah"],
    Sharjah: ["Sharjah City", "Khor Fakkan", "Kalba"],
    "Ras Al Khaimah": ["RAK City", "Al Jazeera Al Hamra"],
  },
};

export const COUNTRIES: string[] = Object.keys(GEO_DATA).sort();
