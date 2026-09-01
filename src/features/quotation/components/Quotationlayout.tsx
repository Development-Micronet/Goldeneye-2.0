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
  FiCheck,
  FiFilter,
} from "react-icons/fi";
import { useUser } from "../../auth/AuthProvider/AuthContext";

const ORDER_OPTIONS = [
  { value: "", label: "All / Default" },
  { value: "desc", label: "New Quotations (Newest First)" },
  { value: "asc", label: "Old Quotations (Oldest First)" },
];

const EMPTY_FILTERS = {
  search: "",
  from_company: "",
  date_from: "",
  date_to: "",
  sort_by: "",
  sort_dir: "",
};

const hasActiveFilter = (f: any) =>
  Boolean(f?.search || f?.from_company || f?.date_from || f?.date_to || f?.sort_dir);

const activeFilterCount = (filters: any) =>
  Object.entries(filters).filter(
    ([k, v]) => v !== "" && v !== null && k !== "search" && k !== "sort_by",
  ).length;

const pillLabel = (key: string, val: string) => {
  const labels: Record<string, string> = {
    search: `Search: "${val}"`,
    from_company: `From: ${val}`,
    date_from: `From Date: ${val}`,
    date_to: `To Date: ${val}`,
    sort_dir: val === "asc" ? "Old Quotations (Oldest First)" : "New Quotations (Newest First)",
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
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
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
    const next = { ...pendingFilters };
    if (next.sort_dir) {
      next.sort_by = "date";
    } else {
      next.sort_by = "";
    }
    setFilters(next);
    setIsFiltered(hasActiveFilter(next));
    setFilterOpen(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setPendingFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setIsFiltered(false);
    setCurrentPage(1);
    setFilterOpen(false);
  };

  const removePill = (key: string) => {
    const next = { ...filters, [key]: "" };
    if (key === "sort_dir") {
      next.sort_by = "";
    }
    setFilters(next);
    setPendingFilters(next);
    setIsFiltered(hasActiveFilter(next));
    setCurrentPage(1);
  };

  const handleQuickSearch = useCallback(
    (val: string) => {
      setPendingFilters((p: any) => ({ ...p, search: val }));
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        const next = { ...filters, search: val };
        setFilters(next);
        setIsFiltered(hasActiveFilter(next));
        setCurrentPage(1);
      }, 450);
    },
    [filters],
  );

  const setPF = (key: string, val: any) => setPendingFilters((p: any) => ({ ...p, [key]: val }));

  const deleteMutation = useMutation({
    mutationFn: (id) => DeleteQuotation(id),
    onSuccess: () => {
      toast.success("Quotation verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["quotations"] }); // refresh the list
      queryClient.invalidateQueries({ queryKey: ["quotations_search"] });
    },
    onError: (err) => toast.error("Failed to delete: " + (err?.message || "Unknown error")),
  });

  const Exportpdf = useMutation({
    mutationFn: async (id) => {
      const response = await GetQuotation(id);
      const quotationData = response?.data ?? response;
      await exportQuotationToPDF(quotationData);
      return response;
    },
    onSuccess: () => toast.success("Quotation exported successfully!"),
    onError: (err) => toast.error("Failed to export: " + (err?.message || "Unknown error")),
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
    onError: (err) => toast.error("Failed to verify: " + (err?.message || "Unknown error")),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (quoteNos: string[]) => {
      const results = await Promise.allSettled(quoteNos.map((no) => DeleteQuotation(no)));
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
      const results = await Promise.allSettled(quoteNos.map((no) => verifyquotation(no)));
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
      prev.includes(quoteNo) ? prev.filter((id) => id !== quoteNo) : [...prev, quoteNo],
    );
  };

  const handleSelectAll = () => {
    const currentNos = quotations.map((q: any) => q.quote_no);
    const allCurrentSelected =
      currentNos.length > 0 && currentNos.every((no: string) => selectedQuoteNos.includes(no));

    if (allCurrentSelected) {
      setSelectedQuoteNos((prev) => prev.filter((no) => !currentNos.includes(no)));
    } else {
      setSelectedQuoteNos((prev) => Array.from(new Set([...prev, ...currentNos])));
    }
  };

  const isAllPageSelected =
    quotations.length > 0 && quotations.every((q: any) => selectedQuoteNos.includes(q.quote_no));

  const isSomePageSelected =
    quotations.some((q: any) => selectedQuoteNos.includes(q.quote_no)) && !isAllPageSelected;

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
    ([k, v]) => v !== "" && v !== null && k !== "sort_by",
  );

  const getDescAmount = (q) =>
    Array.isArray(q.description)
      ? q.description.reduce((sum, item) => sum + (item.amount || 0), 0)
      : 0;

  return (
    <div className="bg-light-50 flex h-screen overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <div className="border-light-300 sticky top-0 z-40 border-b bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-primary-900 text-xl font-bold">Quotations</h1>
                <p className="text-primary-600 mt-0.5 text-xs">
                  {/* {quotations.length} record{quotations.length !== 1 ? "s" : ""} */}
                  {isFiltered && (
                    <span className="text-primary-700 ml-1.5 font-bold">(filtered)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="relative hidden sm:block">
                  <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    className="w-64 rounded-lg border border-gray-300 bg-white py-2 pr-3.5 pl-9 text-xs font-medium text-gray-900 placeholder-gray-500 shadow-xs focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] focus:outline-none"
                    placeholder="Search quotations…"
                    value={pendingFilters.search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleQuickSearch(e.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!filterOpen) {
                      setPendingFilters({ ...filters });
                    }
                    setFilterOpen((p) => !p);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                    filterOpen || isFiltered
                      ? "border-[#2c6671] bg-[#2c6671] text-white hover:bg-[#204e57]"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#2c6671]"
                  }`}
                >
                  <FiSliders className="h-4 w-4" />
                  <span>Filters</span>
                  {activePills.length > 0 && (
                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {activePills.length}
                    </span>
                  )}
                </button>

                {/* Actions Button right after Filter button */}
                <div className="relative" ref={actionMenuRef}>
                  <button
                    type="button"
                    onClick={() => setActionMenuOpen((p) => !p)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold shadow-xs transition-all ${
                      actionMenuOpen || selectedQuoteNos.length > 0
                        ? "border-[#2c6671] bg-[#2c6671] text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-[#2c6671]"
                    }`}
                  >
                    <FiLayers className="h-4 w-4" />
                    <span>Actions</span>
                    {selectedQuoteNos.length > 0 && (
                      <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {selectedQuoteNos.length}
                      </span>
                    )}
                    <FiChevronDown className="ml-0.5 h-3.5 w-3.5" />
                  </button>

                  {actionMenuOpen && (
                    <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                      <div className="border-b border-gray-100 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                        Bulk Options{" "}
                        {selectedQuoteNos.length > 0 ? `(${selectedQuoteNos.length})` : ""}
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkVerify}
                        disabled={selectedQuoteNos.length === 0 || bulkVerifyMutation.isPending}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiCheckCircle className="h-4 w-4 text-teal-600" />
                        <span>{bulkVerifyMutation.isPending ? "Verifying..." : "Bulk Verify"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={
                          selectedQuoteNos.length === 0 ||
                          bulkDeleteMutation.isPending ||
                          !isAuthorize
                        }
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FiTrash2 className="h-4 w-4 text-red-500" />
                        <span>{bulkDeleteMutation.isPending ? "Deleting..." : "Bulk Delete"}</span>
                      </button>
                    </div>
                  )}
                </div>

                <Link
                  to="/quotation?view=create"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2c6671] px-4 py-2 text-xs font-bold whitespace-nowrap text-white shadow-sm transition-all hover:bg-[#204e57]"
                >
                  <FiPlus className="h-4 w-4 stroke-[2.5]" />
                  <span>New Quotation</span>
                </Link>
              </div>
            </div>

            {/* Mobile search */}
            <div className="mt-2.5 sm:hidden">
              <div className="relative">
                <FiSearch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3.5 pl-9 text-xs font-medium text-gray-900 placeholder-gray-500 focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] focus:outline-none"
                  placeholder="Search quotations…"
                  value={pendingFilters.search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleQuickSearch(e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {filterOpen && (
            <form
              onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                applyFilters();
              }}
              className="bg-light-100 border-light-300 border-b p-4 shadow-inner"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelCls}>From Company</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. Micronet"
                    value={pendingFilters.from_company}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPF("from_company", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Date From</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={pendingFilters.date_from}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPF("date_from", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Date To</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={pendingFilters.date_to}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPF("date_to", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Old & New Quotations</label>
                  <select
                    className={inputCls}
                    value={pendingFilters.sort_dir}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const val = e.target.value;
                      setPendingFilters((p: any) => ({
                        ...p,
                        sort_dir: val,
                        sort_by: val ? "date" : "",
                      }));
                    }}
                  >
                    {ORDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-200/80 pt-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-gray-500 transition-colors hover:text-red-600 cursor-pointer"
                >
                  Clear Filters
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#2c6671] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#204e57] cursor-pointer"
                  >
                    <FiCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Submit</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Active Filter Pills */}
          {activePills.length > 0 && (
            <div className="bg-primary-50 border-primary-100 flex flex-wrap items-center gap-1.5 border-b px-4 py-2">
              {activePills.map(([key, val]) => (
                <span
                  key={key}
                  className="border-primary-200 text-primary-700 inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-0.5 text-xs font-medium"
                >
                  {pillLabel(key, val)}
                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => removePill(key)}
                    className="text-primary-400 hover:text-primary-600"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-primary-600 hover:text-primary-700 ml-auto text-xs font-semibold"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Selected items info bar */}
          {selectedQuoteNos.length > 0 && (
            <div className="flex items-center justify-between border-b border-[#2c6671]/20 bg-[#2c6671]/10 px-4 py-2 text-xs font-semibold text-[#2c6671]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2c6671]" />
                {selectedQuoteNos.length} quotation{selectedQuoteNos.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-medium hover:underline"
                >
                  {isAllPageSelected ? "Deselect Page" : "Select Page"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuoteNos([])}
                  className="font-medium text-gray-500 hover:text-gray-700 hover:underline"
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
              <div className="text-primary-600 flex items-center justify-center py-20">
                <div className="text-center">
                  <svg
                    className="mx-auto mb-3 h-8 w-8 animate-spin"
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
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" className="opacity-75" />
                  </svg>
                  <p className="text-sm font-medium">Loading quotations…</p>
                </div>
              </div>
            )}

            {/* Error */}
            {activeQuery.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Failed to load quotations. Please try again.
              </div>
            )}

            {/* Desktop Table */}
            {!activeQuery.isLoading && quotations.length > 0 && (
              <div className="border-light-200 hidden overflow-visible rounded-lg border md:block">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="bg-light-100 border-light-300 border-b">
                      <th className="w-10 px-3 py-2.5 text-center">
                        <input
                          ref={checkboxRef}
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleSelectAll}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#2c6671] focus:ring-[#2c6671]"
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
                          className={`text-primary-700 px-3 py-2.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase ${
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
                  <tbody className="divide-light-200 divide-y bg-white">
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
              <div className="space-y-2 md:hidden">
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
            {!activeQuery.isLoading && quotations.length === 0 && !activeQuery.isError && (
              <div className="text-primary-600 flex flex-col items-center justify-center py-16">
                <svg
                  className="text-light-400 mb-3 h-12 w-12"
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
                <p className="text-primary-900 mb-1 text-sm font-semibold">
                  {isFiltered ? "No matches found" : "No quotations yet"}
                </p>
                <p className="text-primary-600 mb-3 text-xs">
                  {isFiltered
                    ? "Try adjusting your filters"
                    : "Create your first quotation to get started"}
                </p>
                {isFiltered ? (
                  <button
                    onClick={clearFilters}
                    className="bg-primary-100 text-primary-700 hover:bg-primary-200 rounded px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link
                    to="/quotation?view=create"
                    className="bg-primary-600 hover:bg-primary-700 rounded px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                  >
                    Create quotation
                  </Link>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-light-300 mt-4 flex items-center justify-between border-t pt-3">
                <p className="text-primary-600 text-xs">
                  Page <span className="text-primary-900 font-semibold">{currentPage}</span> of{" "}
                  <span className="text-primary-900 font-semibold">{totalPages}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                    className="border-light-300 text-primary-700 hover:bg-light-50 inline-flex items-center gap-1 rounded border bg-white px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      className="h-3.5 w-3.5"
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
                    className="border-light-300 text-primary-700 hover:bg-light-50 inline-flex items-center gap-1 rounded border bg-white px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <svg
                      className="h-3.5 w-3.5"
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
