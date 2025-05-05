// pages/api/quote-sync.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { quoteStore } from './add-to-quote';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { quoteId } = req.query;

  if (!quoteId || typeof quoteId !== 'string') {
    return res.status(400).json({ error: 'Missing quoteId' });
  }

  const items = quoteStore[quoteId] || [];

  if (items.length > 0) {
    const product = items.shift(); // remove from queue after sending once
    return res.status(200).json({ product });
  }

  return res.status(204).end();
}
