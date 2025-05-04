import { useEffect, useState } from "react";

type QuoteItem = {
  name: string;
  price: string;
  image?: string;
};

export default function Home() {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  useEffect(() => {
    // Dynamically load Botpress only once
    const loadBotpress = () => {
      if (document.getElementById("botpress-webchat-script")) return;

      const script = document.createElement("script");
      script.id = "botpress-webchat-script";
      script.src = "https://cdn.botpress.cloud/webchat/v0/inject.js";
      script.async = true;
      script.onload = () => {
        const bp = (window as any).botpress;
        if (bp) {
          bp.init({
            botId: "39331f76-3b0d-434a-a550-bc4f60195d9e",
            clientId: "4e2f894a-f686-4fe0-977a-4ddc533ab7dd",
            selector: "#webchat",
            configuration: {
              botName: "Audico Bot",
              botDescription: "Hi there! 👋 I'm your dedicated AV Consultant from Audico, how can I help you today?",
              website: {
                title: "www.audicoonline.co.za",
                link: "https://www.audicoonline.co.za",
              },
              email: {
                title: "support@audicoonline.co.za",
                link: "mailto:support@audicoonline.co.za",
              },
              phone: {
                title: "010 020-2882",
                link: "tel:0100202882",
              },
              termsOfService: {
                title: "Terms of service",
                link: "https://www.audicoonline.co.za/terms-and-conditions.html",
              },
              privacyPolicy: {
                title: "Privacy policy",
                link: "https://www.audicoonline.co.za/privacy-policy.html",
              },
              color: "#5eb1ef",
              variant: "soft",
              themeMode: "light",
              fontFamily: "inter",
              radius: 1,
              showPoweredBy: false,
              allowFileUpload: true,
            },
          });

          bp.on("webchat:ready", () => {
            bp.open(); // Ensure chat auto-opens
          });
        }
      };

      document.body.appendChild(script);
    };

    loadBotpress();

    // Poll for quote items every 5s
    const poll = setInterval(async () => {
      const res = await fetch("/api/quote-sync");
      const data = await res.json();
      if (data?.product && !quoteItems.find((i) => i.name === data.product.name)) {
        setQuoteItems((prev) => [...prev, data.product]);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [quoteItems]);

  // Actions
  const handleRemove = (index: number) => {
    setQuoteItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteItems }),
    });

    if (!response.ok) {
      alert("Failed to generate PDF.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audico-quote.pdf";
    a.click();
    window.URL.revokeObjectURL(url);
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
      {/* Chat */}
      <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Audico Chat</h2>
        <div id="webchat" className="min-h-[500px] h-[60vh] md:h-[90vh] w-full" />
      </div>

      {/* Quote */}
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
                  {item.image && <img src={item.image} alt={item.name} className="w-32 mt-2" />}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quote Actions */}
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

