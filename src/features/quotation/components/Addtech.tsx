import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AddTechspec,
  GetTechspec,
  GetTechspecById,
  UpdateTechspec,
  DeleteTechspec,
} from "../api/Techspec";
import {
  FiUpload,
  FiImage,
  FiTrash2,
  FiEdit3,
  FiEye,
  FiArrowLeft,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Addtech: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form states for POST (Upload)
  const [productName, setProductName] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [order, setOrder] = useState<number>(0);
  const [image, setImage] = useState<File | null>(null);

  // Edit modal state (PUT)
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editCaption, setEditCaption] = useState<string>("");
  const [editImage, setEditImage] = useState<File | null>(null);

  // Detail view modal state (GET by ID)
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Full image view lightbox state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Fetch images query (GET by product_name or all) using TanStack Query v5 object syntax
  const {
    data: imagesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["getTechspec", productName],
    queryFn: () => GetTechspec(productName),
    retry: 1,
  });

  // Normalize images list from response data
  const images = Array.isArray(imagesData)
    ? imagesData
    : imagesData?.results && Array.isArray(imagesData.results)
    ? imagesData.results
    : imagesData?.data && Array.isArray(imagesData.data)
    ? imagesData.data
    : [];

  // POST Upload mutation using TanStack Query v5 object syntax
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => AddTechspec(formData),
    onSuccess: () => {
      toast.success("Technical specification uploaded successfully!");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["getTechspec"] });
      setCaption("");
      setOrder(0);
      setImage(null);
      const fileInput = document.getElementById("tech-image-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Upload failed!";
      toast.error(msg);
    },
  });

  // PUT Update mutation using TanStack Query v5 object syntax
  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: number | string; formData: FormData }) =>
      UpdateTechspec(id, formData),
    onSuccess: () => {
      toast.success("Technical specification updated successfully!");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["getTechspec"] });
      setEditItem(null);
      setEditCaption("");
      setEditImage(null);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Update failed!";
      toast.error(msg);
    },
  });

  // DELETE mutation using TanStack Query v5 object syntax
  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => DeleteTechspec(id),
    onSuccess: () => {
      toast.success("Technical specification deleted successfully!");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["getTechspec"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Delete failed!";
      toast.error(msg);
    },
  });

  // Form submit handler for POST
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim()) {
      toast.error("Product name is required!");
      return;
    }

    if (!image) {
      toast.error("Please select an image to upload!");
      return;
    }

    const formData = new FormData();
    formData.append("product_name", productName.trim());
    formData.append("caption", caption.trim());
    formData.append("order", order.toString());
    formData.append("image", image);

    uploadMutation.mutate(formData);
  };

  // Open Edit modal
  const handleOpenEdit = (img: any) => {
    setEditItem(img);
    setEditCaption(img.caption || "");
    setEditImage(null);
  };

  // Submit Edit (PUT)
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const id = editItem.id || editItem.techspec_id || editItem.pk;
    const formData = new FormData();
    formData.append("caption", editCaption.trim());
    if (editImage) {
      formData.append("image", editImage);
    }

    updateMutation.mutate({ id, formData });
  };

  // Delete handler
  const handleDelete = (img: any) => {
    const id = img.id || img.techspec_id || img.pk;
    if (window.confirm("Are you sure you want to delete this technical specification image?")) {
      deleteMutation.mutate(id);
    }
  };

  // View details by ID (GET {{base_url}}/api/products/product-tech-image/1/)
  const handleViewDetails = async (img: any) => {
    const id = img.id || img.techspec_id || img.pk;
    try {
      setIsDetailLoading(true);
      const res = await GetTechspecById(id);
      setDetailItem(res || img);
    } catch (err: any) {
      toast.error("Failed to fetch image details");
      setDetailItem(img);
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf2f7] p-4 sm:p-6 lg:p-8">
      {/* Top Header Bar with Back Button */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1b5e65] hover:text-[#154b51] bg-white px-3 py-1.5 rounded-md shadow-sm border border-slate-200 transition-colors"
        >
          <FiArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      {/* Main UI Card */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6 border border-slate-100">
        {/* Form Title matching design in Image 1 */}
        <h2 className="text-xl font-bold text-[#1b5e65] mb-5 flex items-center gap-2">
          <FiUpload className="text-[#1b5e65] w-5 h-5" /> Upload Technical Specification
        </h2>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <input
              type="text"
              placeholder="Product Name"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1b5e65] focus:border-[#1b5e65]"
              value={productName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProductName(e.target.value)
              }
              required
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="Caption"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1b5e65] focus:border-[#1b5e65]"
              value={caption}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCaption(e.target.value)
              }
            />
          </div>

          <div>
            <input
              type="number"
              placeholder="0"
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#1b5e65] focus:border-[#1b5e65]"
              value={order}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setOrder(Number(e.target.value))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tech-image-input"
              type="file"
              accept="image/*"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setImage(e.target.files ? e.target.files[0] : null)
              }
              className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="bg-[#1b5e65] hover:bg-[#154b51] text-white px-5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploadMutation.isPending ? (
                <>
                  <FiRefreshCw className="animate-spin w-3.5 h-3.5" /> Uploading...
                </>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        </form>

        {/* Preview Header matching Image 1 design */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <h3 className="text-base font-bold text-[#1b5e65] mb-4 flex items-center gap-2">
            <FiImage className="text-[#1b5e65] w-4 h-4" /> Preview
          </h3>

          {/* Loading State */}
          {isLoading ? (
            <p className="text-xs text-slate-500 py-2">Loading images...</p>
          ) : isError ? (
            <p className="text-xs text-red-500 py-2">
              {(error as any)?.response?.data?.error || "Error fetching images"}
            </p>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img: any, idx: number) => {
                const imgId = img.id || img.techspec_id || img.pk || idx;
                const imgSrc = img.image || img.image_url || img.file || img.url;
                return (
                  <div
                    key={imgId}
                    className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow transition-shadow group flex flex-col justify-between"
                  >
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={img.caption || "Technical Specification"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                          onClick={() => setPreviewImageUrl(imgSrc)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          No Image Preview
                        </div>
                      )}
                      {img.order !== undefined && (
                        <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                          Order: {img.order}
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                        {img.caption || "No caption"}
                      </p>
                      {img.product_name && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Product: {img.product_name}
                        </p>
                      )}

                      {/* Action buttons (Edit PUT, Delete DELETE, View GET by ID) */}
                      <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-slate-200/60">
                        <button
                          onClick={() => handleViewDetails(img)}
                          className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded"
                          title="View Details (GET by ID)"
                        >
                          <FiEye className="w-3 h-3 text-slate-500" /> View
                        </button>
                        <button
                          onClick={() => handleOpenEdit(img)}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2 py-1 rounded"
                          title="Edit Technical Image (PUT)"
                        >
                          <FiEdit3 className="w-3 h-3 text-blue-600" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(img)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 bg-white border border-red-200 px-2 py-1 rounded"
                          title="Delete Technical Image (DELETE)"
                        >
                          <FiTrash2 className="w-3 h-3 text-red-600" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-2">
              {productName
                ? `No technical specification images found for "${productName}".`
                : "No images found for this product."}
            </p>
          )}
        </div>
      </div>

      {/* Edit Modal (PUT) */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#1b5e65] flex items-center gap-1.5">
                <FiEdit3 className="w-4 h-4" /> Edit Technical Specification (PUT)
              </h3>
              <button
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Caption
                </label>
                <input
                  type="text"
                  placeholder="Updated caption"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1b5e65]"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  New Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setEditImage(e.target.files ? e.target.files[0] : null)
                  }
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-1.5 bg-[#1b5e65] text-white rounded text-xs font-semibold hover:bg-[#154b51] disabled:opacity-50 flex items-center gap-1"
                >
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal (GET by ID) */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-[#1b5e65] flex items-center gap-1.5">
                <FiEye className="w-4 h-4" /> Technical Specification Details (GET by ID)
              </h3>
              <button
                onClick={() => setDetailItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading details...
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg overflow-hidden bg-slate-100 aspect-video">
                  <img
                    src={detailItem.image || detailItem.image_url || detailItem.file || detailItem.url}
                    alt={detailItem.caption || "Image"}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">ID</span>
                    <span className="font-semibold text-slate-700">
                      {detailItem.id || detailItem.techspec_id || detailItem.pk}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Product Name</span>
                    <span className="font-semibold text-slate-700">
                      {detailItem.product_name || "N/A"}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100 col-span-2">
                    <span className="text-slate-400 block text-[10px]">Caption</span>
                    <span className="font-semibold text-slate-700">
                      {detailItem.caption || "No caption"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setDetailItem(null)}
                    className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox / Full Image Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={previewImageUrl}
              alt="Enlarged preview"
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white bg-white/20 hover:bg-white/40 p-2 rounded-full"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Addtech;