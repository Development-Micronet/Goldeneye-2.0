import { toast } from "react-toastify";
import html2canvas from "html2canvas";

export function usePDFDownload(quoteNo: string) {
  const handleDownloadPDF = async (): Promise<void> => {
    const iframe = document.getElementById("quotation-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      toast.error("Preview not found");
      return;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error("Could not access preview");
      return;
    }

    const pages = iframeDoc.querySelectorAll(".page");
    if (!pages || pages.length === 0) {
      toast.error("No pages found in preview");
      return;
    }
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let p = 0; p < pages.length; p++) {
        const canvas = await html2canvas(pages[p] as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          foreignObjectRendering: false,
          windowWidth: 790,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const imgH = (canvas.height * pdfW) / canvas.width;
        if (p > 0) pdf.addPage();

        if (imgH <= pdfH) {
          pdf.addImage(imgData, "JPEG", 0, 0, pdfW, imgH);
        } else {
          let yOffset = 0;
          let remaining = imgH;
          let firstSlice = true;
          while (remaining > 0) {
            if (!firstSlice) pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, -yOffset, pdfW, imgH);
            yOffset += pdfH;
            remaining -= pdfH;
            firstSlice = false;
          }
        }
      }
      pdf.save(`${quoteNo || "quotation"}.pdf`);
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("PDF generation failed");
    }
  };

  return { handleDownloadPDF };
}
