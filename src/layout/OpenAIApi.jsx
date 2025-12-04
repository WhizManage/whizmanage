import { useState } from "react";
import axios from "axios";

const OpenAIApi = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");

  const systemRules = {
    role: "system",
    content: `You convert user requests into JSON actions for a WooCommerce site.

Rules:
- Always return only valid JSON with these keys:
  {
    "confirmation_required": boolean,
    "confirmation_message": string (if confirmation_required is true),
    "action": {
      "type": string,
      "name": string (for identifying product by name),
      "value": number (used in pricing/stock when relevant),
      "regular_value": number (optional),
      "sale_value": number (optional),
      "quantity": number (used in stock or product creation),
      "product_type": string (optional, default is "simple"),
      "number_of_products": number (optional, for bulk creation),
      "category": array of strings (optional),
      "tags": array of strings (optional),
      "product_ids": array of numbers (optional),
      "stock_status": string (optional, for filtering or deleting by stock status),
      "threshold": number (optional, for filtering low stock products),
      "update_type": string (optional, e.g. "status", "name"),
      "is_increase": boolean (optional),
      "is_decrease": boolean (optional),
      "code": string (if type is "create_coupon"),
      "discount_type": string (if type is "create_coupon"),
      "amount": number (if type is "create_coupon"),
      "number_of_coupons": number (optional, for "create_coupon"),
      "force_delete": boolean (optional, for "delete_products"),
      "variations": [ // Only for variable products
        {
          "attributes": {
            "<attribute_name>": "<attribute_value>" // e.g., "Size": "Large"
          },
          "sku": string (optional),
          "regular_price": number,
          "sale_price": number (optional),
          "manage_stock": boolean (optional),
          "stock_quantity": number (optional),
          "stock_status": string (optional)
        }
      ]
    }
  }

Allowed action types:
- "create_product": Creates one or more new products.
    - Requires: "name"
    - Optional:
      - "regular_value", "sale_value", "quantity", "product_type", "number_of_products", "category", "tags"
      - To create a variable product, set "product_type" to "variable" and provide a "variations" array as described above.
- "change_prices_by_percentage"
- "change_prices_by_amount"
- "set_price"
- "get_products"
- "create_coupon"
- "get_products_by_stock_status": requires "stock_status" = "instock" | "outofstock" | "lowstock"
    - Optional: "threshold" for "lowstock"
- "update_stock_quantity": requires "quantity", optional: "is_increase" / "is_decrease"
- "update_product_field": requires "update_type" (e.g. "status", "name")
- "delete_products": Optional fields:
    - "product_ids", "name", "category", "tags", "stock_status", "force_delete"
- "empty_trash": cleans all trashed products

Product creation logic:
- If "number_of_products" > 1, duplicate the product with incremental names (e.g., "Product 1", "Product 2", ...)
- If "product_type" is "variable" and "variations" are provided, create a variable product with defined variations.
- If only "name" is provided, create a simple product.

If the action changes data, set "confirmation_required" to true and provide a "confirmation_message". Otherwise, set "confirmation_required" to false.

If you cannot understand the request, respond with:
{ "error": "Could not understand request" }`
  };


  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setConfirmationMessage("");

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: 'Bearer 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',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [systemRules, { role: "user", content: input }],
        }),
      });

      const data = await res.json();
      const content = data.choices[0].message.content;
      setResponse(content);

      try {
        const parsed = JSON.parse(content);
        if (parsed.confirmation_required) {
          setConfirmationMessage(parsed.confirmation_message || "האם אתה בטוח?");
          setPendingAction(parsed.action);
        } else if (parsed.action) {
          handleConfirm(parsed.action);
        }
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        setResponse("תשובה לא תקינה מה-API");
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("אירעה שגיאה. אנא נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (action = pendingAction) => {
    if (!action) return;
    console.log("Sending action to API:", action);

    try {
      const res = await axios.post(
        window.siteUrl +
        "/wp-json/whizmanage/v1/ai-action",
        pendingAction,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      alert("✔️ פעולה בוצעה: " + res.data.message);
      setConfirmationMessage("");
      setPendingAction(null);
    } catch (error) {
      alert("❌ שגיאה בביצוע הפעולה");
      console.error(error);
    }
  };

  return (
    <div className="p-5 font-sans">
      <h1 className="text-2xl font-bold mb-4">צ'אט עם OpenAI</h1>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="הקלד הודעה..."
        rows="4"
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "טוען..." : "שלח"}
      </button>

      {confirmationMessage && (
        <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded">
          <p className="mb-2">⚠️ <strong>אישור נדרש:</strong> {confirmationMessage}</p>
          <button
            onClick={() => handleConfirm()}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            אשר פעולה
          </button>
        </div>
      )}

      {response && (
        <div className="mt-5">
          <h3 className="text-lg font-semibold mb-2">תשובת ה-AI:</h3>
          <pre className="p-3 bg-gray-100 rounded whitespace-pre-wrap">{response}</pre>
        </div>
      )}
    </div>
  );
};

export default OpenAIApi;
