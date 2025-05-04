import PDFDocument from "pdfkit";
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const doc = new PDFDocument();
  const buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=audico-quote.pdf");
    res.send(pdfData);
  });

  const { quoteItems } = req.body;

  doc.fontSize(18).text("Audico Quote", { underline: true });
  doc.moveDown();

  quoteItems.forEach((item, i) => {
    doc.fontSize(12).text(`${i + 1}. ${item.name} - ${item.price}`);
  });

  doc.end();
}

