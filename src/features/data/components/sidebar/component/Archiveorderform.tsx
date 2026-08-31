import React, { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

import {
    APPLICATIONS,
    ARCHIVE_LABELS,
    ARCHIVE_OPTIONS,
    DELIVERY_TYPES,
    OPTIONAL_PRODUCTION_FIELDS,
    canPlaceOrder,
    submitArchiveRequest,
} from "../api/product.service";
import type { ArchiveIndentPayload } from "../api/product.service";
import type { SelectedArchiveProduct } from "../store/useArchiveProductStore";
import { useAuthStore } from "../../../../../store/useAuthStore";
import Swal from "sweetalert2";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Spherical area of the outer ring, in km². */
const areaKm2 = (coordinates: number[][][]) => {
    const ring = coordinates[0] ?? [];
    const radius = 6371;
    let sum = 0;

    for (let i = 0; i < ring.length - 1; i += 1) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[i + 1];
        sum += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
    }

    return Math.abs((sum * radius * radius) / 2);
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
});

const formatDate = (iso?: string) => (iso ? dateFormat.format(new Date(iso)) : "N/A");

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const field =
    "focus:border-primary w-full min-w-0 rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-700 outline-none";

const labelStyle = "mb-1 block text-sm font-semibold text-gray-900";

const outlineButton =
    "rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-50";

const solidButton =
    "bg-primary hover:bg-primary/90 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Step shell                                                          */
/* ------------------------------------------------------------------ */

const Step: React.FC<{
    number: number;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ number, title, isOpen, onToggle, children }) => (
    <section className="overflow-hidden rounded-lg border border-gray-200">
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="bg-primary-100 flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
        >
            <span className="flex items-center gap-2">
                <span className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white">
                    {number}
                </span>
                <span className="text-sm font-semibold text-gray-900">{title}</span>
            </span>
            <ChevronDown size={16} className={`text-primary ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && <div className="space-y-3 bg-white p-4">{children}</div>}
    </section>
);

const Detail: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <p className="text-sm text-gray-900">
        <span className="font-semibold">{label}:</span>{" "}
        <span className="text-gray-600">{value || "N/A"}</span>
    </p>
);

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

interface ArchiveOrderFormProps {
    product: SelectedArchiveProduct;
    aoi: { type: "Polygon"; coordinates: number[][][] };
    aoiLabel: string;
    onClose: () => void;
}

export const ArchiveOrderForm: React.FC<ArchiveOrderFormProps> = ({
    product,
    aoi,
    aoiLabel,
    onClose,
}) => {
    const { accessToken, user } = useAuthStore();
    const isSuperadmin = canPlaceOrder(user?.roleName);

    const [step, setStep] = useState(1);

    /* Step 1 — production */
    const [fullStrip, setFullStrip] = useState(false);
    const [production, setProduction] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            Object.entries(ARCHIVE_OPTIONS).map(([key, options]) => [
                key,
                OPTIONAL_PRODUCTION_FIELDS.includes(key) ? "" : options[0].value,
            ])
        )
    );

    /* Step 2 — delivery */
    const [customerReference, setCustomerReference] = useState(aoiLabel);
    const [application, setApplication] = useState("");
    const [program, setProgram] = useState("");
    const [deliveryType, setDeliveryType] = useState("");
    const [email, setEmail] = useState(user?.email ?? "");
    const [altEmail, setAltEmail] = useState("");

    /* Step 3 — confirmation */
    const [acceptedLicence, setAcceptedLicence] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const area = useMemo(() => areaKm2(aoi.coordinates), [aoi]);

    const deliveryReady =
        customerReference.trim() !== "" &&
        application !== "" &&
        deliveryType !== "" &&
        isEmail(email.trim()) &&
        (altEmail.trim() === "" || isEmail(altEmail.trim()));

    const applicationLabel = APPLICATIONS.find((item) => item.value === application)?.label;

    const submit = async () => {
        setIsSubmitting(true);
        setError(null);

        const payload: ArchiveIndentPayload = {
            indentType: "Archival",
            full_strip: fullStrip,
            aoi,
            properties: {
                archive_image_id: product.id,
                sensor: product.sensor ?? product.name,
                acquisitionDate: product.acquisitionDate ?? product.date,
            },
            geometric_processing: production.geometric_processing,
            projection_code: production.projection_code,
            spectral_bands_combination: production.spectral_bands_combination,
            orthorectification_dem_reference: production.orthorectification_dem_reference,
            product_format: production.product_format,
            pixel_coding: production.pixel_coding,
            radiometric_processing: production.radiometric_processing,
            licence: production.licence,
            priority: production.priority,
            deliveryType,
            emailId: [email.trim(), altEmail.trim()].filter(Boolean).join(","),
            comments: program.trim() || "Archive search imagery order",
            customerReference: customerReference.trim(),
            application,
        };

        try {
            await submitArchiveRequest(payload, accessToken ?? "", user?.roleName);
            await Swal.fire({
                icon: "success",
                title: isSuperadmin ? "Order Placed Successfully!" : "Request Raised Successfully!",
                text: isSuperadmin
                    ? "Your order has been placed successfully."
                    : "Your request has been raised for approval.",
                confirmButtonText: "OK",
            });
            onClose();
        } catch (caught) {
            setError(
                (axios.isAxiosError(caught) && caught.response?.data?.detail) ||
                (isSuperadmin ? "Could not place the order." : "Could not raise the request.")
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="border-b border-gray-200 bg-white px-4 py-3">
                <h2 className="text-sm font-semibold tracking-wide text-gray-900">
                    ORDER CRITERIA SELECTION
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                    {product.name} · {formatDate(product.acquisitionDate)}
                </p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {/* 1 — Production */}
                <Step
                    number={1}
                    title="Production"
                    isOpen={step === 1}
                    onToggle={() => setStep(step === 1 ? 0 : 1)}
                >
                    <label className="flex items-center gap-2 text-sm text-gray-900">
                        <input
                            type="checkbox"
                            checked={fullStrip}
                            onChange={(event) => setFullStrip(event.target.checked)}
                            className="accent-primary"
                        />
                        Full strip
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {Object.entries(ARCHIVE_OPTIONS).map(([key, options]) => (
                            <div key={key}>
                                <label className={labelStyle} htmlFor={`archive-${key}`}>
                                    {ARCHIVE_LABELS[key]}
                                </label>
                                <select
                                    id={`archive-${key}`}
                                    value={production[key]}
                                    onChange={(event) =>
                                        setProduction((current) => ({ ...current, [key]: event.target.value }))
                                    }
                                    className={field}
                                >
                                    {OPTIONAL_PRODUCTION_FIELDS.includes(key) && <option value="" />}
                                    {options.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" onClick={onClose} className={outlineButton}>
                            Cancel
                        </button>
                        <button type="button" onClick={() => setStep(2)} className={solidButton}>
                            Proceed
                        </button>
                    </div>
                </Step>

                {/* 2 — Delivery */}
                <Step
                    number={2}
                    title="Delivery"
                    isOpen={step === 2}
                    onToggle={() => setStep(step === 2 ? 0 : 2)}
                >
                    <div>
                        <label className={labelStyle} htmlFor="archive-reference">
                            Customer reference <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="archive-reference"
                            value={customerReference}
                            onChange={(event) => setCustomerReference(event.target.value)}
                            className={field}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <label className={labelStyle} htmlFor="archive-application">
                                Application <span className="text-red-600">*</span>
                            </label>
                            <select
                                id="archive-application"
                                value={application}
                                onChange={(event) => setApplication(event.target.value)}
                                className={field}
                            >
                                <option value="">Select Application</option>
                                {APPLICATIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={labelStyle} htmlFor="archive-program">
                                Program
                            </label>
                            <input
                                id="archive-program"
                                value={program}
                                onChange={(event) => setProgram(event.target.value)}
                                className={field}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="archive-delivery">
                            Delivery Type <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="archive-delivery"
                            value={deliveryType}
                            onChange={(event) => setDeliveryType(event.target.value)}
                            className={field}
                        >
                            <option value="">Select Delivery Type</option>
                            {DELIVERY_TYPES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="archive-email">
                            Notifications <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="archive-email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className={field}
                        />
                        <input
                            type="email"
                            value={altEmail}
                            placeholder="Alt Email"
                            onChange={(event) => setAltEmail(event.target.value)}
                            aria-label="Alternative email"
                            className={`${field} mt-2`}
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" onClick={() => setStep(1)} className={outlineButton}>
                            Back
                        </button>
                        <button type="button" onClick={onClose} className={outlineButton}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(3)}
                            disabled={!deliveryReady}
                            className={solidButton}
                        >
                            Proceed
                        </button>
                    </div>
                </Step>

                {/* 3 — Confirmation */}
                <Step
                    number={3}
                    title="Confirmation"
                    isOpen={step === 3}
                    onToggle={() => setStep(step === 3 ? 0 : 3)}
                >
                    <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-base font-bold text-gray-900">AOI &amp; Satellite Details</h3>

                        <div className="mt-3 flex items-baseline justify-between gap-3">
                            <span className="text-primary text-lg font-bold">{product.name}</span>
                            <span className="text-sm font-semibold text-green-600">
                                {area.toFixed(2)} km² invoiced
                            </span>
                        </div>

                        <p className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                            <CalendarDays size={14} className="text-primary" />
                            {formatDate(product.acquisitionDate)}
                        </p>

                        <p className="mt-2 text-sm text-gray-900">
                            <span className="font-semibold">Segment ID:</span>{" "}
                            <span className="text-xs text-gray-500">{product.id}</span>
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Detail
                                label="Incidence angle"
                                value={product.incidenceAngle != null ? `${product.incidenceAngle}°` : undefined}
                            />
                            <Detail
                                label="DEM Reference"
                                value={production.orthorectification_dem_reference}
                            />
                            <Detail label="Geometric Processing" value={production.geometric_processing} />
                            <Detail
                                label="Cloud Coverage"
                                value={product.cloud_cover != null ? `${product.cloud_cover}%` : undefined}
                            />
                            <Detail label="Projection Code" value={production.projection_code} />
                            <Detail label="Pixel Coding" value={production.pixel_coding} />
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="text-base font-bold text-gray-900">
                            Additional Information &amp; Agreements
                        </h3>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Detail label="Application" value={applicationLabel} />
                            <Detail label="Notifications Email" value={email} />
                            <Detail label="Project Reference" value={program} />
                            <Detail label="Alt Email" value={altEmail || "No Email"} />
                            <Detail label="Delivery Type" value={deliveryType} />
                        </div>

                        <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={acceptedLicence}
                                onChange={(event) => setAcceptedLicence(event.target.checked)}
                                className="accent-primary mt-0.5"
                            />
                            <span>
                                I have read and accept the product license{" "}
                                <span className="text-primary underline">({production.licence})</span>
                            </span>
                        </label>

                        <label className="mt-2 flex items-start gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(event) => setAcceptedTerms(event.target.checked)}
                                className="accent-primary mt-0.5"
                            />
                            I have read and accept the general terms and conditions
                        </label>
                    </div>

                    {!isSuperadmin && (
                        <p className="text-xs text-gray-500">
                            Your role raises a request for approval. An administrator places the order.
                        </p>
                    )}

                    {error && (
                        <p className="flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-700">
                            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                            {error}
                        </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        <button type="button" onClick={() => setStep(2)} className={outlineButton}>
                            Back
                        </button>
                        <button type="button" onClick={onClose} className={outlineButton}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submit}
                            disabled={!acceptedLicence || !acceptedTerms || isSubmitting}
                            className={`${solidButton} flex items-center gap-1.5`}
                        >
                            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                            {isSuperadmin ? "Add to Cart" : "Raise Request"}
                        </button>
                    </div>
                </Step>
            </div>
        </div>
    );
};