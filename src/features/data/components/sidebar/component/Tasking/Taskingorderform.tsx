import React, { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Info, Loader2, Plus, X } from "lucide-react";
import axios from "axios";

import {
    APPLICATIONS,
    DELIVERY_TYPES,
    PRODUCT_LABELS,
    PRODUCT_OPTIONS,
    canPlaceOrder,
    submitTasking,
} from "../../api/Tasking.service";
import type {
    MissionKey,
    ProgTypeKey,
    TaskingRequestItem,
    TaskingSegment,
} from "../../api/Tasking.service";
import { useAuthStore } from "../../../../../../store/useAuthStore";
import Swal from "sweetalert2";


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Spherical area of the outer ring, in km². */
const areaKm2 = (rings: number[][][]) => {
    const ring = rings[0] ?? [];
    const radius = 6371;
    let sum = 0;

    for (let i = 0; i < ring.length - 1; i += 1) {
        const [lon1, lat1] = ring[i];
        const [lon2, lat2] = ring[i + 1];
        sum += toRadians(lon2 - lon1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
    }

    return Math.abs((sum * radius * radius) / 2);
};

const dayFormat = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
});

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const field =
    "border-border text-text-muted focus:border-primary w-full min-w-0 rounded-md border bg-white px-2.5 py-2 text-xs outline-none";

const labelStyle = "mb-1 block text-xs font-semibold text-slate-900";

const outlineButton = "border-border text-text-muted rounded-full border px-5 py-2 text-xs";
const solidButton =
    "bg-primary hover:bg-primary/90 rounded-full px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

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
    <section className="border-border overflow-hidden rounded-lg border">
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
                <span className="text-sm font-semibold text-slate-900">{title}</span>
            </span>
            <ChevronDown size={16} className={`text-primary ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && <div className="space-y-3 bg-white p-4">{children}</div>}
    </section>
);

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

interface TaskingOrderFormProps {
    aoiLabel: string;
    rings: number[][][];
    mission: MissionKey;
    progType: ProgTypeKey;
    segment: TaskingSegment;
    maxIncidence: number;
    onCancel: () => void;
    onSubmitted: () => void;
}

export const TaskingOrderForm: React.FC<TaskingOrderFormProps> = ({
    aoiLabel,
    rings,
    mission,
    progType,
    segment,
    maxIncidence,
    onCancel,
    onSubmitted,
}) => {
    const { accessToken, user } = useAuthStore();
    const isSuperadmin = canPlaceOrder(user?.roleName);

    const [step, setStep] = useState(1);

    /* Step 1 — production */
    const [production, setProduction] = useState({
        geometric_processing: PRODUCT_OPTIONS.geometric_processing[0],
        projection_code: PRODUCT_OPTIONS.projection_code[0],
        spectral_bands_combination: PRODUCT_OPTIONS.spectral_bands_combination[0],
        orthorectification_dem_reference: PRODUCT_OPTIONS.orthorectification_dem_reference[0],
        product_format: PRODUCT_OPTIONS.product_format[0],
        pixel_coding: PRODUCT_OPTIONS.pixel_coding[0],
        radiometric_processing: PRODUCT_OPTIONS.radiometric_processing[0],
        licence: PRODUCT_OPTIONS.licence[0],
    } as Record<keyof typeof PRODUCT_OPTIONS, string>);

    /* Step 2 — delivery */
    const [customerReference, setCustomerReference] = useState(aoiLabel);
    const [application, setApplication] = useState(APPLICATIONS[0]);
    const [program, setProgram] = useState("");
    const [deliveryType, setDeliveryType] = useState(DELIVERY_TYPES[0]);
    const [extraEmails, setExtraEmails] = useState<string[]>([]);
    const [emailDraft, setEmailDraft] = useState("");

    /* Step 3 — confirmation */
    const [acceptedLicence, setAcceptedLicence] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const area = useMemo(() => areaKm2(rings), [rings]);
    const deliveryReady = customerReference.trim() !== "" && !!user?.email;

    const addEmail = () => {
        const email = emailDraft.trim();
        if (!isEmail(email) || extraEmails.includes(email)) return;
        setExtraEmails((current) => [...current, email]);
        setEmailDraft("");
    };

    const submit = async () => {
        setIsSubmitting(true);
        setError(null);

        const item: TaskingRequestItem = {
            indentType: "Tasking",
            aoi: { type: "Polygon", coordinates: rings },
            missions: mission,
            progTypeNames: progType,
            segmentKey: segment.segmentKey,
            ...production,
            deliveryType,
            customerReference: customerReference.trim(),
            emailId: [user?.email, ...extraEmails].filter(Boolean).join(","),
            application,
            program: program.trim(),
        };

        try {
            await submitTasking(item, accessToken ?? "", isSuperadmin);
            await Swal.fire({
                icon: "success",
                title: isSuperadmin ? "Order Placed Successfully!" : "Request Raised Successfully!",
                text: isSuperadmin
                    ? "Your order has been placed successfully."
                    : "Your indent/request has been submitted successfully.",
                confirmButtonText: "OK",
            });
            onSubmitted();
        } catch (caught) {
            setError(
                (axios.isAxiosError(caught) && caught.response?.data?.detail) ||
                (isSuperadmin ? "Could not place the order." : "Could not raise the request.")
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ortho at a wide angle degrades geometry, so warn before committing.
    const showAngleWarning =
        production.geometric_processing === "ortho" && segment.incidenceAngle > 20;

    return (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {/* 1 — Production */}
            <Step
                number={1}
                title="Production"
                isOpen={step === 1}
                onToggle={() => setStep(step === 1 ? 0 : 1)}
            >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(Object.keys(PRODUCT_OPTIONS) as Array<keyof typeof PRODUCT_OPTIONS>).map((key) => (
                        <div key={key}>
                            <label className={labelStyle} htmlFor={`production-${key}`}>
                                {PRODUCT_LABELS[key]}
                            </label>
                            <select
                                id={`production-${key}`}
                                value={production[key]}
                                onChange={(event) =>
                                    setProduction((current) => ({ ...current, [key]: event.target.value }))
                                }
                                className={field}
                            >
                                {PRODUCT_OPTIONS[key].map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={onCancel} className={outlineButton}>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelStyle} htmlFor="delivery-reference">
                            Customer reference <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="delivery-reference"
                            value={customerReference}
                            onChange={(event) => setCustomerReference(event.target.value)}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="delivery-application">
                            Application <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="delivery-application"
                            value={application}
                            onChange={(event) => setApplication(event.target.value)}
                            className={field}
                        >
                            {APPLICATIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="delivery-program">
                            Program
                        </label>
                        <input
                            id="delivery-program"
                            value={program}
                            onChange={(event) => setProgram(event.target.value)}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="delivery-type">
                            Delivery type <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="delivery-type"
                            value={deliveryType}
                            onChange={(event) => setDeliveryType(event.target.value)}
                            className={field}
                        >
                            {DELIVERY_TYPES.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <span className={labelStyle}>Notifications</span>
                    <p className="border-border rounded-md border bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
                        {user?.email ?? "No email on this account"}
                    </p>
                </div>

                <div>
                    <label className={labelStyle} htmlFor="delivery-email">
                        Add emails
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            id="delivery-email"
                            value={emailDraft}
                            placeholder="Add another email"
                            onChange={(event) => setEmailDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    addEmail();
                                }
                            }}
                            className={field}
                        />
                        <button
                            type="button"
                            onClick={addEmail}
                            disabled={!isEmail(emailDraft.trim())}
                            aria-label="Add email"
                            className="border-border text-text-muted shrink-0 rounded-md border bg-slate-50 p-2 disabled:opacity-40"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {extraEmails.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                            {extraEmails.map((email) => (
                                <li
                                    key={email}
                                    className="bg-primary-100 text-primary flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
                                >
                                    {email}
                                    <button
                                        type="button"
                                        onClick={() => setExtraEmails((current) => current.filter((e) => e !== email))}
                                        aria-label={`Remove ${email}`}
                                    >
                                        <X size={11} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={() => setStep(1)} className={outlineButton}>
                        Back
                    </button>
                    <button type="button" onClick={onCancel} className={outlineButton}>
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
                <div className="divide-border grid grid-cols-1 gap-4 sm:grid-cols-2 sm:divide-x">
                    <div>
                        <h4 className="text-sm font-bold text-slate-900">AOI details</h4>
                        <p className="text-text-secondary mt-2 text-xs">{aoiLabel}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-900">{area.toFixed(2)} km²</p>
                    </div>

                    <div className="sm:pl-4">
                        <h4 className="text-sm font-bold text-slate-900">Satellite details</h4>
                        <p className="text-text-secondary mt-2 text-xs">{mission}</p>
                        <p className="text-text-secondary mt-2 text-xs">{area.toFixed(2)} km² invoiced</p>
                        <p className="text-text-secondary mt-2 text-xs">
                            {dayFormat.format(new Date(segment.acquisitionStartDate))}{" "}
                            {timeFormat.format(new Date(segment.acquisitionStartDate))}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-900">
                            Incidence angle: {segment.incidenceAngle.toFixed(2)}° - {maxIncidence}°
                        </p>
                    </div>
                </div>

                {showAngleWarning && (
                    <p className="border-border flex items-start gap-2 rounded-md border bg-white px-3 py-2.5 text-xs text-slate-700">
                        <Info size={14} className="text-primary mt-0.5 shrink-0" />
                        Geometric quality can suffer when ortho processing is paired with an incidence angle
                        above 20°.
                    </p>
                )}

                <label className="flex items-start gap-2 text-xs text-slate-700">
                    <input
                        type="checkbox"
                        checked={acceptedLicence}
                        onChange={(event) => setAcceptedLicence(event.target.checked)}
                        className="accent-primary mt-0.5"
                    />
                    <span>
                        I have read and accept the product licence —{" "}
                        <span className="font-semibold text-slate-900">{production.licence}</span>
                    </span>
                </label>

                <label className="flex items-start gap-2 text-xs text-slate-700">
                    <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(event) => setAcceptedTerms(event.target.checked)}
                        className="accent-primary mt-0.5"
                    />
                    <span>
                        I have read and accept the general{" "}
                        <span className="font-semibold text-slate-900">terms and conditions</span>
                    </span>
                </label>

                {!isSuperadmin && (
                    <p className="text-text-secondary text-[11px]">
                        Your role raises a request for approval. An administrator places the order.
                    </p>
                )}

                {error && (
                    <p className="flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-[11px] text-red-700">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        {error}
                    </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={() => setStep(2)} className={outlineButton}>
                        Back
                    </button>
                    <button type="button" onClick={onCancel} className={outlineButton}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!acceptedLicence || !acceptedTerms || isSubmitting}
                        className={`${solidButton} flex items-center gap-1.5`}
                    >
                        {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                        {isSuperadmin ? "Add to cart" : "Raise request"}
                    </button>
                </div>
            </Step>
        </div>
    );
};