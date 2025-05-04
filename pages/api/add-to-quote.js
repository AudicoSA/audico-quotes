
export default async function handler(req, res) {
  try {
    const { productName } = req.body;

    console.log("🔥 Incoming QUOTE_TRIGGER:", req.body);

    if (!productName) {
      return res.status(400).json({
        success: false,
        message: "Missing productName in request body.",
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
      return res
        .status(404)
        .json({ success: false, message: "Product not found in OpenCart." });
    }

    global.quoteSync = {
      product: {
        name: product.name,
        price: product.special || product.price,
        image: product.thumb || null,
      },
    };

    console.log("✅ Product added to quoteSync:", product.name);

    res.status(200).json({ success: true, product });
  } catch (err) {
    console.error("❌ Error in /api/add-to-quote:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}
