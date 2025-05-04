import { useEffect, useState } from "react";

type QuoteItem = {
  name: string;
  price: string;
  image?: string;
};

export default function Home() {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  useEffect(() => {
    const loadBotpress = () => {
      if (document.getElementById("botpress-webchat-inject")) return;

      // Load inject.js script first
      const injectScript = document.createElement("script");
      injectScript.id = "botpress-webchat-inject";
      injectScript.src = "https://cdn.botpress.cloud/webchat/v2.4/inject.js";
      injectScript.async = true;

      injectScript.onload = () => {
        console.log("✅ Botpress inject.js loaded");

        // Then load your Botpress config file
        const configScript = document.createElement("script");
        configScript.src =
          "https://files.bpcontent.cloud/2025/04/23/17/20250423172151-6PCWRVYD.js"; // Replace with your actual config file if different
        configScript.async = true;

        configScript.onload = () => {
          console.log("✅ Botpress config script loaded and initialized");
        };

        configScript.onerror = () => {
          console.error("❌ Failed to load Botpress config script");
        };

        document.body.appendChild(configScript);
      };

      injectScript.onerror = () => {
        console.error("❌ Failed to load Botpress inject.js");
      };

      document.body.appendChild(injectScript);
    };

    loadBotpress();

    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/quote-sync");
        const data = await res.json();
        if (data?.product && !quoteItems.find((i) => i.name === data.product.name)) {
          setQuoteItems((prev) => [...prev, data.product]);
        }
      } catch (err) {
        console.error("❌ Polling error:", err);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [quoteItems]);

  const handleRemove = (index: number) => {
    setQuoteItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteItems }),
      });

      if (!res.ok) return alert("❌ PDF generation failed.");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audico-quote.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ PDF download error:", err);
    }
  };

  const handleEmailQuote = () => {
    alert("📧 Email feature coming soon.");
  };

  const handleAddToCart = () => {
    alert("🛒 Add to cart feature coming soon.");
  };

  const handleTestAddProduct = async () => {
    await fetch("/api/add-to-quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: "Denon AVR-X1800H" }),
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Audico Chat</h2>
        <div
          id="webchat-container"
          className="min-h-screen w-full"
          style={{ position: "relative", width: "100%", height: "100%" }}
        />
      </div>

      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-4">Live Quote</h2>
          {quoteItems.length === 0 ? (
            <p className="text-gray-500">No products added yet.</p>
          ) : (
            <ul className="space-y-4">
              {quoteItems.map((item, index) => (
                <li key={index} className="p-4 border rounded shadow relative">
                  <button
                    onClick={() => handleRemove(index)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    title="Remove item"
                  >
                    ✕
                  </button>
                  <p className="font-bold">{item.name}</p>
                  <p>Price: {item.price}</p>
                  {item.image && (
                    <img src={item.image} alt={item.name} className="w-32 mt-2" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-6">
          <button
            onClick={handlePrint}
            className="bg-white border border-gray-300 hover:bg-gray-100 px-5 py-2 rounded shadow-sm text-sm font-medium"
          >
            📄 PDF Download
          </button>
          <button
            onClick={handleEmailQuote}
            className="bg-white border border-gray-300 hover:bg-gray-100 px-5 py-2 rounded shadow-sm text-sm font-medium"
          >
            📧 Email Quote
          </button>
          <button
            onClick={handleAddToCart}
            className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 rounded shadow-sm text-sm font-medium"
          >
            🛒 Add to Cart
          </button>
          <button
            onClick={handleTestAddProduct}
            className="bg-green-600 text-white hover:bg-green-700 px-5 py-2 rounded shadow-sm text-sm font-medium"
          >
            🧪 Test Add Product
          </button>
        </div>
      </div>
    </div>
  );
}
