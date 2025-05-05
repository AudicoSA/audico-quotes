// pages/api/add-to-quote.js

const quoteMap = new Map(); // Key: quoteId, Value: array of product objects

export default async function handler(req, res) {
  try {
    const { productName, quoteId } = req.body;

    console.log("🔥 Incoming QUOTE_TRIGGER:", req.body);

    if (!productName || !quoteId) {
      return res.status(400).json({
        success: false,
        message: "Missing productName or quoteId in request body.",
      });
    }

    const response = await fetch(
      `https://www.audicoonline.co.za/index.php?route=ocrestapi/product/listing&search=${encodeURIComponent(
        productName
      )}`,
      {
        headers: {
          Authorization:
            "Basic b2NyZXN0YXBpX29hdXRoX2NsaWVudDpvY3Jlc3RhcGlfb2F1dGhfc2VjcmV0",
        },
      }
    );

    const data = await response.json();
    const products = data?.data?.products || [];
    const product = products.length > 0 ? products[0] : null;

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found in OpenCart.",
      });
    }

    const productToAdd = {
      name: product.name,
      price: product.special || product.price,
      image: product.thumb || null,
    };

    const currentQuote = quoteMap.get(quoteId) || [];
    quoteMap.set(quoteId, [...currentQuote, productToAdd]);

    console.log(`✅ Added to quote [${quoteId}]:`, product.name);

    return res.status(200).json({ success: true, product: productToAdd });
  } catch (err) {
    console.error("❌ Error in /api/add-to-quote:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}

// Export map for other APIs like /api/quote-sync to use
export { quoteMap };

