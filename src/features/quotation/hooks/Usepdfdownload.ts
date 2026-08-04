// /**
//  * downloadAsPDF  — v4  (native browser print engine)
//  *
//  * WHY html2canvas fails:
//  *   html2canvas re-renders your HTML in a hidden off-screen clone.
//  *   The browser's rasteriser has sub-pixel rounding differences vs the
//  *   live layout engine, so text always appears shifted/touching borders.
//  *   No amount of scale or CSS fixes this — it's a fundamental rendering gap.
//  *
//  * THE FIX — window.print() via a hidden <iframe>:
//  *   The browser's native print engine renders the EXACT same layout as the
//  *   live preview, with real vector text (infinitely sharp at any zoom),
//  *   correct padding/borders, and no rounding artefacts.
//  *
//  * HOW IT WORKS:
//  *   1. Write your HTML into a hidden <iframe>
//  *   2. Inject @page CSS so each .page element maps to one A4 sheet
//  *   3. Call iframe.contentWindow.print()
//  *   4. Browser shows "Save as PDF" dialog — user saves the file.
//  *      The filename hint is set via the document <title>.
//  *
//  * USAGE:
//  *   await downloadAsPDF(htmlContent, "quotation.pdf")
//  */
// export function downloadAsPDF(htmlContent, filename = "quotation.pdf") {
//   return new Promise((resolve) => {

//     /* ── 1. Create a hidden iframe ──────────────────────────────────────── */
//     const iframe = document.createElement("iframe");
//     iframe.style.cssText = [
//       "position:fixed",
//       "left:-99999px",
//       "top:0",
//       "width:210mm",
//       "height:297mm",
//       "border:none",
//       "visibility:hidden",
//     ].join(";");
//     document.body.appendChild(iframe);

//     /* ── 2. Write document into iframe ──────────────────────────────────── */
//     const doc = iframe.contentDocument || iframe.contentWindow.document;

//     // Extract <style> blocks from the original HTML to keep all colors/fonts
//     const styleBlocks = [
//       ...(htmlContent.match(/<style[\s\S]*?<\/style>/gi) || []),
//     ].join("\n");

//     // Extract body content if a full HTML document was passed
//     const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
//     const innerHTML = bodyMatch ? bodyMatch[1] : htmlContent;

//     doc.open();
//     doc.write(`<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8"/>
//   <title>${filename.replace(/\.pdf$/i, "")}</title>
//   ${styleBlocks}
//   <style>
//     @page {
//       size: A4 portrait;
//       margin: 0;
//     }

//     @media print {
//       html, body {
//         margin: 0;
//         padding: 0;
//         background: #fff;
//         -webkit-print-color-adjust: exact;
//         print-color-adjust: exact;
//         color-adjust: exact;
//       }

//       /*
//        * Each .page = one A4 sheet.
//        * Do NOT reset padding here — your existing CSS already defines 12px
//        * padding on .page and that is what makes text NOT touch the borders.
//        * Resetting it would cause the very problem we're fixing.
//        */
//       .page {
//         width: 100% !important;
//         max-width: 100% !important;
//         margin: 0 !important;
//         border: none !important;
//         box-shadow: none !important;
//         page-break-after: always;
//         break-after: page;
//         overflow: visible !important;
//         /* padding is intentionally NOT overridden here */
//       }

//       .page:last-child {
//         page-break-after: avoid;
//         break-after: avoid;
//       }

//       table, tr, td, th, img {
//         page-break-inside: avoid;
//         break-inside: avoid;
//       }

//       * {
//         -webkit-print-color-adjust: exact !important;
//         print-color-adjust: exact !important;
//         color-adjust: exact !important;
//       }
//     }
//   </style>
// </head>
// <body>${innerHTML}</body>
// </html>`);
//     doc.close();

//     /* ── 3. Wait for resources then print ───────────────────────────────── */
//     iframe.onload = async () => {
//       try {
//         const win = iframe.contentWindow;

//         // Wait for all <img> elements to load
//         await Promise.all(
//           Array.from(doc.querySelectorAll("img")).map((img) =>
//             img.complete
//               ? Promise.resolve()
//               : new Promise((res) => {
//                   img.onload = res;
//                   img.onerror = res;
//                 })
//           )
//         );

//         // Wait for web fonts
//         if (doc.fonts?.ready) {
//           await doc.fonts.ready;
//         }

//         // Two rAF ticks for full layout reflow
//         await new Promise((res) =>
//           win.requestAnimationFrame(() => win.requestAnimationFrame(res))
//         );

//         /* ── 4. Trigger print dialog ────────────────────────────────────── */
//         win.focus();
//         win.print();

//         // Clean up after print dialog closes / user saves
//         setTimeout(() => {
//           document.body.removeChild(iframe);
//           resolve(true);
//         }, 1500);

//       } catch (err) {
//         console.error("PDF print error:", err);
//         document.body.removeChild(iframe);
//         resolve(false);
//       }
//     };
//   });
// }


// /* ─────────────────────────────────────────────────────────────────────────────
//  * SERVER-SIDE ALTERNATIVE (Puppeteer) — bypasses the Save dialog entirely,
//  * produces a downloadable PDF blob. Use this if you want a direct file
//  * download without the browser's print dialog appearing.
//  *
//  *   // server.js  (Node.js)
//  *   import puppeteer from "puppeteer";
//  *
//  *   export async function htmlToPDF(htmlContent) {
//  *     const browser = await puppeteer.launch();
//  *     const page = await browser.newPage();
//  *     await page.setContent(htmlContent, { waitUntil: "networkidle0" });
//  *     const pdf = await page.pdf({
//  *       format: "A4",
//  *       printBackground: true,
//  *       margin: { top: 0, right: 0, bottom: 0, left: 0 },
//  *     });
//  *     await browser.close();
//  *     return pdf;  // Buffer — send as application/pdf response
//  *   }
//  *
//  * Puppeteer uses Chromium — the exact same engine as your browser preview —
//  * so output is pixel-perfect. No dialog, no user interaction required.
//  * ───────────────────────────────────────────────────────────────────────────── */


export function downloadAsPDF(
  htmlContent: string,
  filename: string = "quotation.pdf"
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const iframe = document.createElement("iframe");

    iframe.style.cssText = [
      "position:fixed",
      "left:-99999px",
      "top:0",
      "width:210mm",
      "height:297mm",
      "border:none",
      "visibility:hidden",
    ].join(";");

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;

    if (!doc) {
      document.body.removeChild(iframe);
      resolve(false);
      return;
    }

    const styleBlocks = (
      htmlContent.match(/<style[\s\S]*?<\/style>/gi) || []
    ).join("\n");

    const bodyMatch = htmlContent.match(
      /<body[^>]*>([\s\S]*)<\/body>/i
    );

    const innerHTML = bodyMatch ? bodyMatch[1] : htmlContent;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${filename}</title>

${styleBlocks}

<style>
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  html,
  body {
    margin: 0;
    padding: 0;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }

  .page {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
    page-break-after: always;
    break-after: page;
    overflow: visible !important;
  }

  .page:last-child {
    page-break-after: avoid;
    break-after: avoid;
  }

  table,
  tr,
  td,
  th,
  img {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Hide button while printing */
  .kml-btn-wrap {
    display: none !important;
  }

  /* Show print card only in PDF */
  .kml-print-card {
    display: flex !important;
  }
}

/* Screen styles */
.kml-print-card {
  display: none;
}
</style>

</head>

<body>
${innerHTML}
</body>
</html>`);

    doc.close();

    iframe.onload = async (): Promise<void> => {
      try {
        const win = iframe.contentWindow;

        if (!win) {
          document.body.removeChild(iframe);
          resolve(false);
          return;
        }

        // Wait for all images
        const images = Array.from(doc.querySelectorAll<HTMLImageElement>("img"));

        await Promise.all(
          images.map(
            (img) =>
              img.complete
                ? Promise.resolve()
                : new Promise<void>((res) => {
                    img.onload = () => res();
                    img.onerror = () => res();
                  })
          )
        );

        // Wait for web fonts
        if ("fonts" in doc && doc.fonts) {
          await doc.fonts.ready;
        }

        // Wait two animation frames for layout
        await new Promise<void>((res) =>
          win.requestAnimationFrame(() =>
            win.requestAnimationFrame(() => res())
          )
        );

        win.focus();
        win.print();

        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          resolve(true);
        }, 1500);
      } catch (error) {
        console.error("PDF print error:", error);

        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }

        resolve(false);
      }
    };
  });
}