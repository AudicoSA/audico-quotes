// pages/api/quote-sync.js

import { quoteMap } from './add-to-quote';

export default function handler(req, res) {
  const quoteId = req.query.quoteId;

  if (!quoteId || !quoteMap.has(quoteId)) {
    return res.status(200).json({ product: null });
  }

  const userQuote = quoteMap.get(quoteId);
  const lastProduct = userQuote[userQuote.length - 1];

  res.status(200).json({ product: lastProduct });
}

