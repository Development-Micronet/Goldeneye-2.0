import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GetQuotation,
  SearchQuotation,
  Getallquotations,
  DeleteQuotation,
  verifyquotation,
} from "../api/Quotation";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { exportQuotationToPDF } from "../utils/exportQuotationToPDF";
import Swal from "sweetalert2";
import QuotationRow from "../assets/Microcomponent/QuotationRow";
import QuotationCardMobile from "../assets/Microcomponent/QuotationCardMobile";
import {
  FiSearch,
  FiSliders,
  FiPlus,
  FiChevronDown,
  FiTrash2,
  FiCheckCircle,
  FiLayers,
} from "react-icons/fi";
import { useUser } from "../../auth/AuthProvider/AuthContext";

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "date", label: "Date" },
  { value: "amount", label: "Amount" },
  { value: "company", label: "Company" },
];

const GST_OPTIONS = [
  { value: "", label: "Any" },
  { value: "cgst", label: "CGST" },
  { value: "sgst", label: "SGST" },
  { value: "igst", label: "IGST" },
];

const DELIVERY_OPTIONS = [
  { value: "", label: "Any" },
  { value: "VIA FTP ONLY", label: "FTP" },
  { value: "EMAIL", label: "Email" },
];

const INCOTERMS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "EXW", label: "EXW" },
  { value: "CIF", label: "CIF" },
  { value: "FOB", label: "FOB" },
];

const EMPTY_FILTERS = {
  search: "",
  company: "",
  from_company: "",
  date_from: "",
  date_to: "",
  amount_min: "",
  amount_max: "",
  gst_type: "",
  delivery: "",
  incoterms: "",
  validity: "",
  has_images: "",
  sort_by: "",
  sort_dir: "desc",
};

const activeFilterCount = (filters) =>
  Object.entries(filters).filter(
    ([k, v]) => v !== "" && v !== null && k !== "sort_dir",
  ).length;

const pillLabel = (key, val) => {
  const labels = {
    search: `Search: "${val}"`,
    company: `Client: ${val}`,
    from_company: `From: ${val}`,
    date_from: `From: ${val}`,
    date_to: `To: ${val}`,
    amount_min: `Min ₹${val}`,
    amount_max: `Max ₹${val}`,
    gst_type: `GST: ${val.toUpperCase()}`,
    delivery: `Delivery: ${val}`,
    incoterms: `Incoterms: ${val}`,
    validity: `Validity: ${val}d`,
    has_images: val === "true" ? "Has Images" : "No Images",
    sort_by: `Sort: ${val}`,
  };
  return labels[key] || `${key}: ${val}`;
};

const inputCls =
  "w-full px-2.5 py-1.5 text-xs border border-light-300 rounded bg-white text-primary-900 placeholder-light-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100";

const labelCls = "block text-xs font-semibold text-primary-700 mb-1";

const Quotationlayout = () => {
  const { role } = useUser() || {};
  const isAuthorize = role === "superadmin" || role === "admin";

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<any>(EMPTY_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<any>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [isFiltered, setIsFiltered] = useState<boolean>(false);
  const [selectedQuoteNos, setSelectedQuoteNos] = useState<string[]>([]);
  const [actionMenuOpen, setActionMenuOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();
  const searchTimer = useRef(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(event.target as Node)
      ) {
        setActionMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto refetch fresh quotations list whenever Quotationlayout mounts
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
    queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
  }, [queryClient]);

  const getAllQuotations = useQuery({
    queryKey: ["quotations", currentPage],
    queryFn: () => Getallquotations(currentPage),
    enabled: !isFiltered,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const searchQuery = useQuery({
    queryKey: ["quotations_search", filters, currentPage],
    queryFn: () => SearchQuotation(filters, currentPage),
    enabled: isFiltered,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const activeQuery = isFiltered ? searchQuery : getAllQuotations;
  const rawData = activeQuery?.data;
  const quotations = Array.isArray(rawData?.results)
    ? rawData.results
    : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData)
        ? rawData
        : [];
  const totalPages = rawData?.total_pages || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const applyFilters = () => {
    const hasActive = activeFilterCount(pendingFilters) > 0;
    setFilters({ ...pendingFilters });
    setIsFiltered(hasActive);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setPendingFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setIsFiltered(false);
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const removePill = (key) => {
    const next = { ...filters, [key]: "" };
    setFilters(next);
    setPendingFilters(next);
    setIsFiltered(activeFilterCount(next) > 0);
    setCurrentPage(1);
  };

  const handleQuickSearch = useCallback(
    (val) => {
      setPendingFilters((p) => ({ ...p, search: val }));
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        const next = { ...filters, search: val };
        setFilters(next);
        setIsFiltered(activeFilterCount(next) > 0);
        setCurrentPage(1);
      }, 450);
    },
    [filters],
  );

  const setPF = (key, val) => setPendingFilters((p) => ({ ...p, [key]: val }));

  const deleteMutation = useMutation({
    mutationFn: (id) => DeleteQuotation(id),
    onSuccess: () => {
      toast.success("Quotation verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["quotations"] }); // refresh the list
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
    onError: (err) =>
      toast.error("Failed to delete: " + (err?.message || "Unknown error")),
  });

  const Exportpdf = useMutation({
    mutationFn: async (id) => {
      const response = await GetQuotation(id);
      const quotationData = response?.data ?? response;
      await exportQuotationToPDF(quotationData);
      return response;
    },
    onSuccess: () => toast.success("Quotation exported successfully!"),
    onError: (err) =>
      toast.error("Failed to export: " + (err?.message || "Unknown error")),
  });

  const verificationmutation = useMutation({
    mutationFn: (quote_no) => {
      return verifyquotation(quote_no);
    }, // only send quote_no
    onSuccess: (res) => {
      console.log(res);
      toast.success(
        `${res.message} and ${res.verified ? "verified" : "not verified"} and ${res.quote_no}`,
      );
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
    onError: (err) =>
      toast.error("Failed to verify: " + (err?.message || "Unknown error")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (quoteNos: string[]) => {
      const results = await Promise.allSettled(
        quoteNos.map((no) => DeleteQuotation(no))
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length > 0) {
        throw new Error(`Failed to delete ${rejected.length} item(s)`);
      }
      return fulfilled.length;
    },
    onSuccess: (count) => {
      toast.success(`Successfully deleted ${count} quotation(s)!`);
      setSelectedQuoteNos([]);
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete selected quotations");
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: async (quoteNos: string[]) => {
      const results = await Promise.allSettled(
        quoteNos.map((no) => verifyquotation(no))
      );
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      if (rejected.length > 0) {
        throw new Error(`Failed to verify ${rejected.length} item(s)`);
      }
      return fulfilled.length;
    },
    onSuccess: (count) => {
      toast.success(`Successfully verified ${count} quotation(s)!`);
      setSelectedQuoteNos([]);
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to verify selected quotations");
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
  });

  const handleBulkDelete = () => {
    setActionMenuOpen(false);
    if (selectedQuoteNos.length === 0) {
      toast.info("Please select at least one quotation to delete.");
      return;
    }
    if (!isAuthorize) {
      toast.error("You are not authorized to delete quotations.");
      return;
    }
    Swal.fire({
      title: "Delete Selected Quotations?",
      text: `Are you sure you want to delete ${selectedQuoteNos.length} selected quotation(s)? This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: `Yes, delete ${selectedQuoteNos.length} item(s)!`,
    }).then((result) => {
      if (result.isConfirmed) {
        bulkDeleteMutation.mutate(selectedQuoteNos);
      }
    });
  };

  const handleBulkVerify = () => {
    setActionMenuOpen(false);
    if (selectedQuoteNos.length === 0) {
      toast.info("Please select at least one quotation to verify.");
      return;
    }
    Swal.fire({
      title: "Verify Selected Quotations?",
      text: `Are you sure you want to verify ${selectedQuoteNos.length} selected quotation(s)?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2c6671",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Yes, verify ${selectedQuoteNos.length} item(s)!`,
    }).then((result) => {
      if (result.isConfirmed) {
        bulkVerifyMutation.mutate(selectedQuoteNos);
      }
    });
  };

  const handleToggleSelectRow = (quoteNo: string) => {
    setSelectedQuoteNos((prev) =>
      prev.includes(quoteNo)
        ? prev.filter((id) => id !== quoteNo)
        : [...prev, quoteNo]
    );
  };

  const handleSelectAll = () => {
    const currentNos = quotations.map((q: any) => q.quote_no);
    const allCurrentSelected =
      currentNos.length > 0 &&
      currentNos.every((no: string) => selectedQuoteNos.includes(no));

    if (allCurrentSelected) {
      setSelectedQuoteNos((prev) =>
        prev.filter((no) => !currentNos.includes(no))
      );
    } else {
      setSelectedQuoteNos((prev) =>
        Array.from(new Set([...prev, ...currentNos]))
      );
    }
  };

  const isAllPageSelected =
    quotations.length > 0 &&
    quotations.every((q: any) => selectedQuoteNos.includes(q.quote_no));

  const isSomePageSelected =
    quotations.some((q: any) => selectedQuoteNos.includes(q.quote_no)) &&
    !isAllPageSelected;

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  const handleDelete = (quoteNo) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate(quoteNo);
    });
  };

  const activePills = Object.entries(filters).filter(
    ([k, v]) => v !== "" && v !== null && k !== "sort_dir",
  );

  const getDescAmount = (q) =>
    Array.isArray(q.description)
      ? q.description.reduce((sum, item) => sum + (item.amount || 0), 0)
      : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-light-50">
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <div className="bg-white border-b border-light-300 sticky top-0 z-40 px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h1 className="text-xl font-bold text-primary-900">
                  Quotations
                </h1>
                <p className="text-xs text-primary-600 mt-0.5">
                  {/* {quotations.length} record{quotations.length !== 1 ? "s" : ""} */}
                  {isFiltered && (
                    <span className="ml-1.5 text-primary-700 font-bold">
                      (filtered)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative hidden sm:block">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    className="pl-9 pr-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] w-64 shadow-xs"
                    placeholder="Search quotations…"
                    value={pendingFilters.search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQuickSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFilterOpen((p) => !p)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all shadow-xs ${
                    filterOpen || isFiltered
                      ? "bg-[#2c6671] text-white border-[#2c6671]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-[#2c6671]"
                  }`}
                >
                  <FiSliders className="w-4 h-4" />
                  <span>Filters</span>
                  {activePills.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-bold">
                      {activePills.length}
                    </span>
                  )}
                </button>

                {/* Actions Button right after Filter button */}
                <div className="relative" ref={actionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setActionMenuOpen((p) => !p)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all shadow-xs ${
                      actionMenuOpen || selectedQuoteNos.length > 0
                        ? "bg-[#2c6671] text-white border-[#2c6671]"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-[#2c6671]"
                    }`}
                  >
                    <FiLayers className="w-4 h-4" />
                    <span>Actions</span>
                    {selectedQuoteNos.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-bold">
                        {selectedQuoteNos.length}
                      </span>
                    )}
                    <FiChevronDown className="w-3.5 h-3.5 ml-0.5" />
                  </button>

                  {actionMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        Bulk Options {selectedQuoteNos.length > 0 ? `(${selectedQuoteNos.length})` : ""}
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkVerify}
                        disabled={selectedQuoteNos.length === 0 || bulkVerifyMutation.isPending}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiCheckCircle className="w-4 h-4 text-teal-600" />
                        <span>{bulkVerifyMutation.isPending ? "Verifying..." : "Bulk Verify"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={selectedQuoteNos.length === 0 || bulkDeleteMutation.isPending || !isAuthorize}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4 text-red-500" />
                        <span>{bulkDeleteMutation.isPending ? "Deleting..." : "Bulk Delete"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/quotation?view=create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2c6671] hover:bg-[#204e57] text-white text-xs font-bold rounded-lg shadow-sm transition-all whitespace-nowrap"
                >
                  <FiPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>New Quotation</span>
                </Link>
              </div>
            </div>

            {/* Mobile search */}
            <div className="mt-2.5 sm:hidden">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                  placeholder="Search quotations…"
                  value={pendingFilters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleQuickSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {filterOpen && (
            <div className="bg-light-100 border-b border-light-300 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Client Company</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. ISRO"
                    value={pendingFilters.company}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("company", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>From Company</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Micronet"
                    value={pendingFilters.from_company}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("from_company", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Date From</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={pendingFilters.date_from}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("date_from", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Date To</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={pendingFilters.date_to}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("date_to", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Min Amount (₹)</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="0"
                    value={pendingFilters.amount_min}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("amount_min", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Max Amount (₹)</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="No limit"
                    value={pendingFilters.amount_max}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("amount_max", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>GST Type</label>
                  <select
                    className={inputCls}
                    value={pendingFilters.gst_type}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("gst_type", e.target.value)}
                  >
                    {GST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Delivery</label>
                  <select
                    className={inputCls}
                    value={pendingFilters.delivery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("delivery", e.target.value)}
                  >
                    {DELIVERY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Incoterms</label>
                  <select
                    className={inputCls}
                    value={pendingFilters.incoterms}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("incoterms", e.target.value)}
                  >
                    {INCOTERMS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Validity (days)</label>
                  <input
                    type="number"
                    className={inputCls}
                    placeholder="e.g. 30"
                    value={pendingFilters.validity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("validity", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Images</label>
                  <select
                    className={inputCls}
                    value={pendingFilters.has_images}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("has_images", e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="true">Has Images</option>
                    <option value="false">No Images</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Sort By</label>
                  <select
                    className={inputCls}
                    value={pendingFilters.sort_by}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPF("sort_by", e.target.value)}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Clear
                </button>
                <button
                  onClick={applyFilters}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Active Filter Pills */}
          {activePills.length > 0 && (
            <div className="px-4 py-2 bg-primary-50 border-b border-primary-100 flex flex-wrap items-center gap-1.5">
              {activePills.map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 bg-white border border-primary-200 text-primary-700 px-2.5 py-0.5 text-xs font-medium rounded-full"
                >
                  {pillLabel(key, val)}
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => removePill(key)}
                    className="text-primary-400 hover:text-primary-600"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                onClick={clearFilters}
                className="ml-auto text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Selected items info bar */}
          {selectedQuoteNos.length > 0 && (
            <div className="px-4 py-2 bg-[#2c6671]/10 border-b border-[#2c6671]/20 flex items-center justify-between text-xs font-semibold text-[#2c6671]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2c6671]" />
                {selectedQuoteNos.length} quotation{selectedQuoteNos.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="hover:underline font-medium"
                >
                  {isAllPageSelected ? "Deselect Page" : "Select Page"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuoteNos([])}
                  className="hover:underline text-gray-500 hover:text-gray-700 font-medium"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-3 sm:p-4">
            {/* Loading */}
            {activeQuery.isLoading && (
              <div className="flex items-center justify-center py-20 text-primary-600">
                <div className="text-center">
                  <svg
                    className="animate-spin w-8 h-8 mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                      className="opacity-75"
                    />
                  </svg>
                  <p className="text-sm font-medium">Loading quotations…</p>
                </div>
              </div>
            )}

            {/* Error */}
            {activeQuery.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                Failed to load quotations. Please try again.
              </div>
            )}

            {/* Desktop Table */}
            {!activeQuery.isLoading && quotations.length > 0 && (
              <div className="hidden md:block overflow-visible rounded-lg border border-light-200">
                <table className="w-full text-[13px] text-left">
                  <thead>
                    <tr className="bg-light-100 border-b border-light-300">
                      <th className="px-3 py-2.5 w-10 text-center">
                        <input
                          ref={checkboxRef}
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 text-[#2c6671] focus:ring-[#2c6671] cursor-pointer w-4 h-4"
                          title="Select / Deselect all on this page"
                        />
                      </th>
                      {[
                        "S.No",
                        "Company",
                        "Contact",
                        "Quote No",
                        "Date",
                        "Valid Till",
                        "Total",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th
                          key={h}
                          className={`px-3 py-2.5 text-[11px] font-semibold text-primary-700 uppercase tracking-wide whitespace-nowrap ${
                            h === "Contact"
                              ? "hidden lg:table-cell"
                              : h === "Date"
                                ? "hidden sm:table-cell"
                                : h === "Valid Till"
                                  ? "hidden xl:table-cell"
                                  : h === "Amount"
                                    ? "hidden md:table-cell"
                                    : h === "Status"
                                      ? "hidden sm:table-cell"
                                      : h === "Actions"
                                        ? "text-center"
                                        : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-light-200">
                    {quotations.map((q, index) => (
                      <QuotationRow
                        key={q.quote_no}
                        q={q}
                        index={index}
                        currentPage={currentPage}
                        descAmount={getDescAmount(q)}
                        handleDelete={handleDelete}
                        deleteMutation={deleteMutation}
                        Exportpdf={Exportpdf}
                        verificationmutation={verificationmutation}
                        isSelected={selectedQuoteNos.includes(q.quote_no)}
                        onToggleSelect={handleToggleSelectRow}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile Cards */}
            {!activeQuery.isLoading && quotations.length > 0 && (
              <div className="md:hidden space-y-2">
                {quotations.map((q) => {
                  const descAmount = getDescAmount(q);
                  return (
                    <QuotationCardMobile
                      key={q.quote_no}
                      q={q}
                      descAmount={descAmount}
                      handleDelete={handleDelete}
                      deleteMutation={deleteMutation}
                      Exportpdf={Exportpdf}
                      isSelected={selectedQuoteNos.includes(q.quote_no)}
                      onToggleSelect={handleToggleSelectRow}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!activeQuery.isLoading &&
              quotations.length === 0 &&
              !activeQuery.isError && (
                <div className="flex flex-col items-center justify-center py-16 text-primary-600">
                  <svg
                    className="w-12 h-12 text-light-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-semibold mb-1 text-primary-900">
                    {isFiltered ? "No matches found" : "No quotations yet"}
                  </p>
                  <p className="text-xs text-primary-600 mb-3">
                    {isFiltered
                      ? "Try adjusting your filters"
                      : "Create your first quotation to get started"}
                  </p>
                  {isFiltered ? (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-1.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link
                      to="/quotation?view=create"
                      className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                    >
                      Create quotation
                    </Link>
                  )}
                </div>
              )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 pt-3 border-t border-light-300 flex items-center justify-between">
                <p className="text-xs text-primary-600">
                  Page{" "}
                  <span className="font-semibold text-primary-900">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-primary-900">
                    {totalPages}
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-light-300 text-primary-700 bg-white hover:bg-light-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Prev
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-light-300 text-primary-700 bg-white hover:bg-light-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Quotationlayout;
