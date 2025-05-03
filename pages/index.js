import { useEffect, useState } from "react";

export default function Home() {
  const [quoteItems, setQuoteItems] = useState([]);

  useEffect(() => {
    const poll = setInterval(async () => {
      const res = await fetch("/api/quote-sync");
      const data = await res.json();
      if (data?.product && !quoteItems.find((i) => i.name === data.product.name)) {
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
        <div
          className="h-[90vh] w-full"
          dangerouslySetInnerHTML={{
            __html: `
              <iframe style="height: 100%; width: 100%; border: none;" srcdoc='
                <!doctype html>
                <html lang="en">
                  <head>
                    <style>
                      html, body {
                        margin: 0;
                        padding: 0;
                        height: 100%;
                        width: 100%;
                        overflow: hidden;
                      }
                      .bpWebchat {
                        position: absolute !important;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        width: 100% !important;
                        height: 100% !important;
                      }
                      .bpFab {
                        display: none;
                      }
                    </style>
                    <script src="https://cdn.botpress.cloud/webchat/v2.4/inject.js" defer></script>
                    <script src="https://files.bpcontent.cloud/2025/04/23/17/20250423172151-6PCWRVYD.js" defer></script>
                  </head>
                  <body>
                    <div id="webchat"></div>
                    <script>
                      window.addEventListener("load", () => {
                        if (window.botpressWebChat) {
                          window.botpressWebChat.init({
                            selector: "#webchat"
                          });
                          window.botpressWebChat.on("webchat:ready", () => {
                            window.botpressWebChat.open();
                          });
                        }
                      });
                    </script>
                  </body>
                </html>
              '></iframe>
            `,
          }}
        ></div>
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