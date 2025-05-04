import { useEffect, useState } from "react";

export default function Home() {
  const [quoteItems, setQuoteItems] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.botpress) {
        clearInterval(interval);

        window.botpress.on("webchat:ready", () => {
          window.botpress.open(); // ✅ Always open chat on all devices
        });

        window.botpress.init({
          botId: "39331f76-3b0d-434a-a550-bc4f60195d9e",
          clientId: "4e2f894a-f686-4fe0-977a-4ddc533ab7dd",
          selector: "#webchat",
          configuration: {
            botName: "Audico Bot",
            botDescription:
              "Hi there! 👋 I'm your dedicated AV Consultant from Audico, how can I help you today?",
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
      }
    }, 100);

    const poll = setInterval(async () => {
      const res = await fetch("/api/quote-sync");
      const data = await res.json();
      if (data?.product && !quoteItems.find((i) => i.name === data.product.name)) {
        setQuoteItems((prev) => [...prev, data.product]);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(poll);
    };
  }, [quoteItems]);

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Chat Panel */}
      <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Audico Chat</h2>
        <div id="webchat" className="min-h-[500px] h-[60vh] md:h-[90vh] w-full" />
      </div>

      {/* Quote Panel */}
      <div className="w-full md:w-1/2 p-6 overflow-y-auto">
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