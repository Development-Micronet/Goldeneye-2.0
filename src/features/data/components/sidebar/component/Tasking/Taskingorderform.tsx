import React, { useMemo, useState } from "react";
import { ChevronDown, Info, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

import {
    MARKETS,
    apiErrorMessage,
    earliestAcquisitionDate,
    ORDER_LABELS,
    ORDER_OPTIONS,
    buildIndentPayload,
    buildOrderPayload,
    canPlaceOrder,
    defaultProduction,
    labelFor,
    orderEndpointFor,
    submitTaskingIndent,
    submitTaskingOrder,
} from "../../api/Tasking.service";
import type {
    AcquisitionMode,
    MissionKey,
    OrderFieldKey,
    ProgTypeKey,
    TaskingOrderForm as OrderFormValues,
    TaskingSegment,
} from "../../api/Tasking.service";
import { useAuthStore } from "../../../../../../store/useAuthStore";

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

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <p className="text-xs text-slate-900">
        <span className="font-semibold">{label}:</span>{" "}
        <span className="text-text-secondary">{value || "N/A"}</span>
    </p>
);

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

interface TaskingOrderFormProps {
    aoiLabel: string;
    rings: number[][][];
    mission: MissionKey;
    progType: ProgTypeKey;
    acquisitionMode: AcquisitionMode;
    segment: TaskingSegment;
    /** Search filters, used as the starting values for the order. */
    startDate: string;
    endDate: string;
    cloudCover: number;
    maxIncidence: number;
    onCancel: () => void;
    onSubmitted: () => void;
}

export const TaskingOrderForm: React.FC<TaskingOrderFormProps> = ({
    aoiLabel,
    rings,
    mission,
    progType,
    acquisitionMode,
    segment,
    startDate,
    endDate,
    cloudCover,
    maxIncidence,
    onCancel,
    onSubmitted,
}) => {
    const { accessToken, user } = useAuthStore();
    const queryClient = useQueryClient();

    // Direct ordering needs both the role and a published endpoint for this pass.
    const orderEndpoint = orderEndpointFor(mission, progType);
    const isOrder = canPlaceOrder(user?.roleName) && Boolean(orderEndpoint);

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // The order carries its own window, and it faces the same lead-time rule.
    const minStart = useMemo(() => earliestAcquisitionDate(), []);

    // Construct a detailed customer reference formatted like: GE-SPOT-ONEDAY-TEST-01
    const defaultCustomerReference = useMemo(() => {
        const username = user?.user || user?.customerName || "";
        const clean = (str?: string) =>
            (str || "")
                .trim()
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9-_]/g, "")
                .toUpperCase();

        const parts = [
            "GE",
            clean(mission),
            clean(progType),
            clean(username),
            clean(aoiLabel),
        ].filter(Boolean);

        return parts.join("-");
    }, [user?.user, user?.customerName, mission, progType, aoiLabel]);

    const [form, setForm] = useState<OrderFormValues>({
        ...defaultProduction(),
        acquisitionStartDate: startDate,
        acquisitionEndDate: endDate,
        maxCloudCover: cloudCover,
        maxIncidenceAngle: maxIncidence,
        customerReference: defaultCustomerReference,
        comments: "",
        emailId: user?.email ?? "",
        primaryMarket: MARKETS[0].value,
        secondaryMarket: "",
        cost: 0,
    });

    const [acceptedLicence, setAcceptedLicence] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const set = <K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) =>
        setForm((current) => ({ ...current, [key]: value }));

    const area = useMemo(() => areaKm2(rings), [rings]);

    const detailsReady =
        form.acquisitionStartDate >= minStart &&
        form.customerReference.trim() !== "" &&
        form.primaryMarket !== "" &&
        isEmail(form.emailId.trim()) &&
        form.acquisitionEndDate >= form.acquisitionStartDate &&
        form.maxCloudCover >= 0 &&
        form.maxCloudCover <= 100 &&
        form.maxIncidenceAngle >= 0 &&
        form.maxIncidenceAngle <= 90;

    const submit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const context = {
            aoi: { type: "Polygon" as const, coordinates: rings },
            mission,
            progType,
            acquisitionMode,
            segmentKey: segment.segmentKey,
        };

        try {
            if (isOrder) {
                await submitTaskingOrder(orderEndpoint!, buildOrderPayload(form, context), accessToken ?? "");
                toast.success("Order placed successfully.");
            } else {
                await submitTaskingIndent(buildIndentPayload(form, context), accessToken ?? "");
                toast.success("Indent created successfully.");
            }

            await queryClient.invalidateQueries({ queryKey: ["taskings"] });
            onSubmitted();
        } catch (caught) {
            toast.error(
                apiErrorMessage(caught) ||
                (isOrder
                    ? "Failed to place order. Please try again."
                    : "Failed to create indent. Please try again.")
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    // Ortho at a wide angle degrades geometry, so warn before committing.
    const showAngleWarning = form.processing_level === "ortho" && segment.incidenceAngle > 20;

    return (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-900">
                    {isOrder ? "ORDER IMAGE" : "CREATE TASKING INDENT"}
                </h2>
                <p className="text-text-secondary mt-0.5 text-[11px]">
                    {mission} · {progType} · {dateTimeFormat.format(new Date(segment.acquisitionStartDate))}
                </p>
            </div>

            {/* 1 — Production */}
            <Step
                number={1}
                title="Production"
                isOpen={step === 1}
                onToggle={() => setStep(step === 1 ? 0 : 1)}
            >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(Object.keys(ORDER_OPTIONS) as OrderFieldKey[]).map((key) => (
                        <div key={key}>
                            <label className={labelStyle} htmlFor={`order-${key}`}>
                                {ORDER_LABELS[key]}
                            </label>
                            <select
                                id={`order-${key}`}
                                value={form[key]}
                                onChange={(event) => set(key, event.target.value)}
                                className={field}
                            >
                                {ORDER_OPTIONS[key].map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
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

            {/* 2 — Order details */}
            <Step
                number={2}
                title="Order details"
                isOpen={step === 2}
                onToggle={() => setStep(step === 2 ? 0 : 2)}
            >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <label className={labelStyle} htmlFor="order-start">
                            Acquisition start <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="order-start"
                            type="date"
                            min={minStart}
                            value={form.acquisitionStartDate}
                            onChange={(event) => set("acquisitionStartDate", event.target.value)}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-end">
                            Acquisition end <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="order-end"
                            type="date"
                            min={form.acquisitionStartDate}
                            value={form.acquisitionEndDate}
                            onChange={(event) => set("acquisitionEndDate", event.target.value)}
                            className={field}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <p className="text-text-secondary text-[11px]">
                            The window has to start on or after {minStart} — Airbus needs a month of lead time.
                        </p>
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-cloud">
                            Max cloud cover (%)
                        </label>
                        <input
                            id="order-cloud"
                            type="number"
                            min={0}
                            max={100}
                            value={form.maxCloudCover}
                            onChange={(event) => set("maxCloudCover", Number(event.target.value))}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-incidence">
                            Max incidence angle (°)
                        </label>
                        <input
                            id="order-incidence"
                            type="number"
                            min={0}
                            max={90}
                            value={form.maxIncidenceAngle}
                            onChange={(event) => set("maxIncidenceAngle", Number(event.target.value))}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-reference">
                            Customer reference <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="order-reference"
                            value={form.customerReference}
                            onChange={(event) => set("customerReference", event.target.value)}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-email">
                            Email <span className="text-red-600">*</span>
                        </label>
                        <input
                            id="order-email"
                            type="email"
                            value={form.emailId}
                            onChange={(event) => set("emailId", event.target.value)}
                            className={field}
                        />
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-primary-market">
                            Primary market <span className="text-red-600">*</span>
                        </label>
                        <select
                            id="order-primary-market"
                            value={form.primaryMarket}
                            onChange={(event) => set("primaryMarket", event.target.value)}
                            className={field}
                        >
                            {MARKETS.map((market) => (
                                <option key={market.value} value={market.value}>
                                    {market.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelStyle} htmlFor="order-secondary-market">
                            Secondary market
                        </label>
                        <select
                            id="order-secondary-market"
                            value={form.secondaryMarket}
                            onChange={(event) => set("secondaryMarket", event.target.value)}
                            className={field}
                        >
                            <option value="">None</option>
                            {MARKETS.map((market) => (
                                <option key={market.value} value={market.value}>
                                    {market.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isOrder && (
                        <div>
                            <label className={labelStyle} htmlFor="order-cost">
                                Cost
                            </label>
                            <input
                                id="order-cost"
                                type="number"
                                min={0}
                                value={form.cost}
                                onChange={(event) => set("cost", Number(event.target.value))}
                                className={field}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelStyle} htmlFor="order-comments">
                        Comments
                    </label>
                    <textarea
                        id="order-comments"
                        rows={2}
                        value={form.comments}
                        onChange={(event) => set("comments", event.target.value)}
                        className={field}
                    />
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
                        disabled={!detailsReady}
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-900">AOI details</h4>
                        <Detail label="Area of interest" value={aoiLabel} />
                        <Detail label="Area" value={`${area.toFixed(2)} km²`} />
                        <Detail label="Customer reference" value={form.customerReference} />
                        <Detail label="Market" value={form.primaryMarket} />
                    </div>

                    <div className="space-y-2 sm:border-l sm:border-slate-200 sm:pl-4">
                        <h4 className="text-sm font-bold text-slate-900">Satellite details</h4>
                        <Detail label="Mission" value={`${mission} · ${progType}`} />
                        <Detail
                            label="Acquisition"
                            value={dateTimeFormat.format(new Date(segment.acquisitionStartDate))}
                        />
                        <Detail
                            label="Incidence angle"
                            value={`${segment.incidenceAngle.toFixed(2)}° - ${form.maxIncidenceAngle}°`}
                        />
                        <Detail label="Processing" value={labelFor("processing_level", form.processing_level)} />
                        <Detail label="Format" value={labelFor("image_format", form.image_format)} />
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
                        <span className="font-semibold text-slate-900">{labelFor("licence", form.licence)}</span>
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

                {!isOrder && (
                    <p className="text-text-secondary text-[11px]">
                        {canPlaceOrder(user?.roleName)
                            ? "Direct ordering isn't published for this mission and programme, so this goes to the approval queue."
                            : "Your role creates an indent for approval. An administrator places the order."}
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
                        {isOrder ? "Place order" : "Create indent"}
                    </button>
                </div>
            </Step>
        </div>
    );
};