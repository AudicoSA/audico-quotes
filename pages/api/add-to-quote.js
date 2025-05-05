// pages/api/add-to-quote.ts
import { NextApiRequest, NextApiResponse } from 'next';

let quoteStore: Record<string, any[]> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { productName, quoteId } = req.body;

  if (!productName || !quoteId) {
    return res.status(400).json({ error: 'Missing productName or quoteId' });
  }

  const mockPrice = "R15,990.00";
  const mockImage = "https://www.audicoonline.co.za/image/cache/catalog/Denon/AVR-X1800H-500x500.jpg";

  const product = {
    name: productName,
    price: mockPrice,
    image: mockImage,
  };

  if (!quoteStore[quoteId]) {
    quoteStore[quoteId] = [];
  }

  quoteStore[quoteId].push(product);
  console.log(`✅ Product "${productName}" added to quote ${quoteId}`);
  res.status(200).json({ success: true });
}

export { quoteStore };

