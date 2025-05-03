import { useEffect, useState } from "react";

export default function Home() {
  const [quoteItems, setQuoteItems] = useState([]);

  useEffect(() => {
    // Inject Botpress script dynamically
    const script = document.createElement("script");
    script.src = "https://cdn.botpress.cloud/webchat/v2.4/inject.js";
    script.async = true;
    script.onload = () => {
      window.botpressWebChat.init({
        configUrl:
          "https://files.bpcontent.cloud/2025/04/23/17/20250423172151-6PCWRVYD.js",
        selector: "#webchat",
      });
    };
    document.body.appendChild(script);

    // Poll quote sync API
    const poll = setInterval(async () => {
      const res = await fetch("/api/quote-sync");
      const data = await res.json();
      if (
        data?.product &&
        !quoteItems.find((i) => i.name === data.product.name)
      ) {
        setQuoteItems((prev) => [...prev, data.product]);
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [quoteItems]);

  return (
    <div className="flex h-screen">
      {/* Chat Area */}
      <div className="w-1/2 p-6 border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Audico Chat</h2>
        <div id="webchat" className="h-[90vh] w-full" />
      </div>

      {/* Quote Panel */}
      <div className="w-1/2 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Live Quote</h2>
        {quoteItems.length === 0 ? (
          <p className="text-gray-500">No products added yet.</p>
        ) : (
          <ul className="space-y-4">
            {quoteItems.map((item, index) => (
              <li key={index} className="p-4 border rounded shadow">
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
    </div>
  );
}
