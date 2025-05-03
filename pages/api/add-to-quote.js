export default async function handler(req, res) {
    const { productName } = req.body;
  
    const response = await fetch(
      `https://www.audicoonline.co.za/index.php?route=ocrestapi/product/listing&search=${encodeURIComponent(productName)}`,
      {
        headers: {
          Authorization: "Basic b2NyZXN0YXBpX29hdXRoX2NsaWVudDpvY3Jlc3RhcGlfb2F1dGhfc2VjcmV0",
        },
      }
    );
  
    const data = await response.json();
    const product = data && data.length > 0 ? data[0] : null;
  
    global.quoteSync = { product }; // mock in-memory store
    res.status(200).json({ success: true });
  }
  