import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AddTechspec, GetTechspec } from "../api/Techspec";
import { FiUpload, FiImage } from "react-icons/fi";
import { toast } from "react-toastify";

const Addtech = () => {
  const [productName, setProductName] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [order, setOrder] = useState<number>(0);
  const [image, setImage] = useState<any>(null);

  // Upload mutation
  const mutation = useMutation(AddTechspec, {
    onSuccess: () => {
      toast.success("Image uploaded successfully!");
      refetch();
      setCaption("");
      setOrder(0);
      setImage(null);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || "Upload failed!";
      toast.error(msg);
    },
  });

  // Fetch images query
  const {
    data: images,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["getTechspec", productName],
    () => GetTechspec(productName),
    {
      enabled: !!productName,
      retry: false, // disable automatic retry
      onError: (err) => {
        const msg = err?.response?.data?.error || "Failed to fetch images";
        toast.error(msg);
      },
    }
  );

  const handleSubmit = (e) => {
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
    formData.append("product_name", productName);
    formData.append("caption", caption);
    formData.append("order", order);
    formData.append("image", image);

    mutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-primary-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-6 transition-all duration-300 hover:shadow-xl">
        <h2 className="text-2xl font-bold text-primary-600 mb-4 flex items-center gap-2">
          <FiUpload /> Upload Technical Specification
        </h2>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Product Name"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-300"
            value={productName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductName(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Caption"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-300"
            value={caption}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCaption(e.target.value)}
          />

          <input
            type="number"
            placeholder="Order"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary-300"
            value={order}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrder(Number(e.target.value))}
          />

          <input
            type="file"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImage(e.target.files[0])}
            className="w-full"
            required
          />

          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 transition-all duration-200 active:scale-95"
          >
            {mutation.isLoading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {/* PREVIEW */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-primary-500 mb-4 flex items-center gap-2">
            <FiImage /> Preview
          </h3>

          {isLoading ? (
            <p>Loading images...</p>
          ) : error ? (
            <p className="text-red-500">
              {error?.response?.data?.error || "Error fetching images"}
            </p>
          ) : images?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img) => (
                <div
                  key={img.techspec_id}
                  className="bg-light-100 rounded-lg overflow-hidden shadow hover:shadow-lg transition-all duration-300 group"
                >
                  <img
                    src={img.image_url}
                    alt={img.caption || "No caption"}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-2 text-sm text-gray-600 text-center">
                    {img.caption || "No caption"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No images found for this product.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Addtech;