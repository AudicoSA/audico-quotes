import { NextApiRequest, NextApiResponse } from "next";
import { jsPDF } from "jspdf";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { quoteItems } = req.body;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Audico Quote", 10, 10);

  let y = 20;
  quoteItems.forEach((item, i) => {
    doc.setFontSize(12);
    doc.text(`${i + 1}. ${item.name} - ${item.price}`, 10, y);
    y += 10;
  });

  const pdf = doc.output("arraybuffer");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=quote.pdf");
  res.status(200).send(Buffer.from(pdf));
}
