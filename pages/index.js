import { useEffect, useState } from "react";

export default function Home() {
  const [quoteItems, setQuoteItems] = useState([]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.botpress.cloud/webchat/v2.4/inject.js";
    script.async = true;
    script.onload = () => {
      window.botpressWebChat.init({
        botId: "39331f76-3b0d-434a-a550-bc4f60195d9e",
        clientId: "4e2f894a-f686-4fe0-977a-4ddc533ab7dd",
        selector: "#webchat-container",
        showPoweredBy: false,
        themeName: "prism",
        layoutWidth: "100%",
        stylesheet: "",
        configuration: {
          botName: "Audico Bot",
          botDescription:
            "Hi there! 👋 I'm your dedicated AV Consultant from Audico, how can I help you today?",
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
          allowFileUpload: true,
        },
      });

      window.botpressWebChat.on("webchat:ready", () => {
        window.botpressWebChat.open();
      });
    };
    document.body.appendChild(script);

    return () => {
      clearInterval(poll);
    };
  }, []);

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
      {/* Embedded Chat */}
      <div className="w-1/2 p-6 border-r border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Audico Chat</h2>
        <div
          id="webchat-container"
          style={{ width: "100%", height: "90vh", position: "relative" }}
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
