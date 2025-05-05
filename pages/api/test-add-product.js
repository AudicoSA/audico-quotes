export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }
  
    try {
      const { productName } = req.body;
  
      if (!productName) {
        return res.status(400).json({ success: false, message: "Missing productName" });
      }
  
      const response = await fetch(
        `https://www.audicoonline.co.za/index.php?route=ocrestapi/product/listing&search=${encodeURIComponent(productName)}`,
        {
          headers: {
            Authorization:
              "Basic b2NyZXN0YXBpX29hdXRoX2NsaWVudDpvY3Jlc3RhcGlfb2F1dGhfc2VjcmV0",
          },
        }
      );
  
      const data = await response.json();
      const products = data?.data?.products || [];
      const product = products[0];
  
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found." });
      }
  
      return res.status(200).json({
        success: true,
        product: {
          name: product.name,
          price: product.special || product.price,
          image: product.thumb || null,
        },
      });
    } catch (err) {
      console.error("❌ Test add product error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  
  