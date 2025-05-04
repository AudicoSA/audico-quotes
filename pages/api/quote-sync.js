export default async function handler(req, res) {
  const result = global.quoteSync || {};
  global.quoteSync = null; // ✅ clear after serving
  res.status(200).json(result);
}