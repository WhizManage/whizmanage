// ./discount-rules/RuleForm.jsx
import { useMemo, useState } from "react";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@components/ui/select";
import { Switch } from "@components/ui/switch";
import { Separator } from "@components/ui/separator";
import { AlertTriangle, Info } from "lucide-react";

const TYPES = [
  { value: "simple_product_discount", label: "הנחה על מוצר" },   // Product Adjustment
  { value: "bulk_discount", label: "Bulk / מדרגות" },            // Bulk Discount
  { value: "buy_x_get_y", label: "קנה X קבל Y" },                // Buy X Get Y
  { value: "cart_discount", label: "הנחת עגלה" },                // Cart Adjustment
  { value: "set_price", label: "מחיר סט קבוע" }                  // Set price
];

const TYPE_HELP = {
  simple_product_discount: "הנחה ישירה על מחיר המוצר (אחוז/סכום קבוע).",
  bulk_discount: "הנחה מדרגות לפי כמות בשורה.",
  buy_x_get_y: "על כל X שנקנו, מקבלים Y (מתנה/אחוז הנחה).",
  cart_discount: "הנחה על כל העגלה (אחוז/סכום), לעיתים עם תנאי Subtotal.",
  set_price: "מחיר כולל לקבוצת יחידות (למשל 3 ב־₪100).",
};

export default function RuleForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(() => normalizeInitial(initial));
  const [errors, setErrors] = useState({});
  const typeHelp = useMemo(() => TYPE_HELP[form.discount_type] || "", [form.discount_type]);

  function normalizeInitial(i){
    const j2o = (v)=>{ try { return typeof v==='string'? JSON.parse(v): v; } catch { return null; } };
    return {
      id: i?.id,
      // General
      title: i?.title || "",
      enabled: i?.enabled ?? 1,
      exclusive: i?.exclusive ?? 0,
      priority: i?.priority ?? 10,
      discount_type: i?.discount_type || "simple_product_discount",
      // Schedule/Usage
      date_from: i?.date_from || "",
      date_to: i?.date_to || "",
      usage_limits: i?.usage_limits ?? 0,
      // Apply To
      filters: i?.filters ? (typeof i.filters==='string' ? JSON.parse(i.filters) : i.filters) : [],
      // Conditions
      conditions: i?.conditions ? (typeof i.conditions==='string' ? JSON.parse(i.conditions) : i.conditions) : [],
      // Discount Config (simple implemented)
      product_adjustments: i?.product_adjustments ? j2o(i.product_adjustments) : null,
      cart_adjustments: i?.cart_adjustments ? j2o(i.cart_adjustments) : null,
      // Advanced (placeholders, UI only now)
      bulk_adjustments: i?.bulk_adjustments ? j2o(i.bulk_adjustments) : { ranges: [] },
      buy_x_get_y_adjustments: i?.buy_x_get_y_adjustments ? j2o(i.buy_x_get_y_adjustments) : { ranges: [] },
      set_adjustments: i?.set_adjustments ? j2o(i.set_adjustments) : { ranges: [] },
    };
  }

  function setField(k, v){ setForm(s => ({...s, [k]: v})); }

  function validate(){
    const e = {};
    if (!form.title.trim()) e.title = "נדרש שם חוק";
    if (!form.discount_type) e.discount_type = "בחר סוג חוק";
    if (!form.filters || form.filters.length===0) e.filters = "בחר סינון (למשל: כל המוצרים)";

    if (form.discount_type === "simple_product_discount") {
      const t = form.product_adjustments?.type || "percentage";
      const v = +form.product_adjustments?.value || 0;
      if (v <= 0) e.product_adjustments = "ערך הנחה חייב להיות גדול מ-0";
      if (!["percentage","fixed"].includes(t)) e.product_adjustments = "סוג הנחה שגוי";
    }

    if (form.discount_type === "cart_discount") {
      const v = +form.cart_adjustments?.value || 0;
      if (v <= 0) e.cart_adjustments = "ערך הנחה חייב להיות גדול מ-0";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(){
    if (!validate()) return;
    // כרגע אין שרת – נבצע onSaved() בלבד כדי לסגור/לרענן
    onSaved?.();
  }

  /* ---------- UI helpers ---------- */
  const addFilterAll = () => setField("filters", [...(form.filters||[]), {type:"all_products"}]);
  const addBulkRow = () => setField("bulk_adjustments", {ranges:[...(form.bulk_adjustments?.ranges||[]), {from:1,to:"",type:"percentage",value:5,label:""}]});
  const addBxGyRow = () => setField("buy_x_get_y_adjustments", {ranges:[...(form.buy_x_get_y_adjustments?.ranges||[]), {from:1,to:"",free_type:"free_product",free_qty:1,free_value:"",products:[]}]});
  const addSetRow  = () => setField("set_adjustments", {ranges:[...(form.set_adjustments?.ranges||[]), {from:2,type:"fixed_set_price",value:100,label:""}]});

  const RulePreview = () => (
    <div className="p-3 rounded-md bg-muted/40 text-sm">
      <div className="font-medium mb-1">תקציר:</div>
      <div>
        {form.title ? <span>“{form.title}”</span> : <span>חוק ללא שם</span>} · סוג: {TYPES.find(t=>t.value===form.discount_type)?.label}
        {" · "}עדיפות {form.priority} · {form.enabled ? "פעיל" : "לא פעיל"}
      </div>
      {form.date_from || form.date_to ? (
        <div>תוקף: {form.date_from || "∞"} → {form.date_to || "∞"}</div>
      ) : (
        <div>תוקף: תמיד</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* -------- General (כמו Flycart: כותרת, סוג, הפעלה) -------- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold">כללי</h3>
          <Info className="w-4 h-4 text-muted-foreground" title="שם, סוג, הפעלה ותוקף" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">שם חוק *</label>
            <Input placeholder="לדוגמה: 10% על כל החנות" value={form.title} onChange={e=>setField("title", e.target.value)} />
            {errors.title && <ErrorMsg>{errors.title}</ErrorMsg>}
          </div>
          <div>
            <label className="text-sm">סוג חוק *</label>
            <Select value={form.discount_type} onValueChange={v=>setField("discount_type", v)}>
              <SelectTrigger><SelectValue placeholder="בחר סוג"/></SelectTrigger>
              <SelectContent>
                {TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{typeHelp}</p>
            {errors.discount_type && <ErrorMsg>{errors.discount_type}</ErrorMsg>}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm">פעיל</label>
              <Switch checked={!!form.enabled} onCheckedChange={v=>setField("enabled", v ? 1 : 0)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">בלעדי</label>
              <Switch checked={!!form.exclusive} onCheckedChange={v=>setField("exclusive", v ? 1 : 0)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm">עדיפות</label>
              <Input type="number" placeholder="10" value={form.priority} onChange={e=>setField("priority", +e.target.value || 0)} />
              <p className="text-xs text-muted-foreground mt-1">מספר קטן = קודם.</p>
            </div>
            <div>
              <label className="text-sm">תוקף מ־</label>
              <Input placeholder="YYYY-MM-DD" value={form.date_from || ""} onChange={e=>setField("date_from", e.target.value)} />
            </div>
            <div>
              <label className="text-sm">תוקף עד</label>
              <Input placeholder="YYYY-MM-DD" value={form.date_to || ""} onChange={e=>setField("date_to", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm">מגבלת שימוש</label>
            <Input type="number" placeholder="0 = ללא הגבלה" value={form.usage_limits}
                   onChange={e=>setField("usage_limits", +e.target.value || 0)} />
          </div>
        </div>
      </section>

      <Separator />

      {/* -------- Apply To / Filters (כמו Flycart: Products/Categories) -------- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold">סינון מוצרים (“Apply To”)</h3>
          <Info className="w-4 h-4 text-muted-foreground" title="על אילו מוצרים/קטגוריות יחול החוק" />
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          בחר אילו פריטים מושפעים מהחוק. להתחלה מהירה: “כל המוצרים”.
        </div>

        <div className="flex gap-2 mb-2">
          <Button variant="outline" onClick={addFilterAll}>הוסף: כל המוצרים</Button>
          {/* בהמשך נוסיף בוחרי מוצרים/קטגוריות עם אוטוקומפליט */}
        </div>

        {errors.filters && <ErrorMsg>{errors.filters}</ErrorMsg>}
        {Array.isArray(form.filters) && form.filters.length>0 && (
          <pre className="bg-muted/40 text-xs p-2 rounded overflow-auto max-h-32">{JSON.stringify(form.filters, null, 2)}</pre>
        )}
      </section>

      <Separator />

      {/* -------- Discount Configuration -------- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold">פרטי ההנחה</h3>
          <Info className="w-4 h-4 text-muted-foreground" title="איך ההנחה מחושבת בפועל" />
        </div>

        {/* Product Adjustment – ממומש */}
        {form.discount_type === "simple_product_discount" && (
          <Card>
            <div className="text-sm text-muted-foreground mb-2">הנחה ישירה על מחיר המוצר.</div>
            <Row label="סוג הנחה">
              <Select
                value={form.product_adjustments?.type || "percentage"}
                onValueChange={v=>setForm(s=>({...s, product_adjustments:{...(s.product_adjustments||{}), type:v}}))}
              >
                <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">אחוז</SelectItem>
                  <SelectItem value="fixed">סכום קבוע</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="ערך">
              <Input type="number" placeholder="לדוגמה: 10"
                value={form.product_adjustments?.value || 10}
                onChange={e=>setForm(s=>({...s, product_adjustments:{...(s.product_adjustments||{}), value:+e.target.value}}))}
              />
            </Row>
            {errors.product_adjustments && <ErrorMsg>{errors.product_adjustments}</ErrorMsg>}
          </Card>
        )}

        {/* Cart Adjustment – ממומש */}
        {form.discount_type === "cart_discount" && (
          <Card>
            <div className="text-sm text-muted-foreground mb-2">הנחה על כל העגלה.</div>
            <Row label="סוג ההנחה">
              <Select
                value={form.cart_adjustments?.type || "percentage"}
                onValueChange={v=>setForm(s=>({...s, cart_adjustments:{...(s.cart_adjustments||{}), type:v}}))}
              >
                <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">אחוז</SelectItem>
                  <SelectItem value="fixed">סכום קבוע</SelectItem>
                </SelectContent>
              </Select>
            </Row>
            <Row label="ערך">
              <Input type="number" placeholder="לדוגמה: 5"
                     value={form.cart_adjustments?.value || 10}
                     onChange={e=>setForm(s=>({...s, cart_adjustments:{...(s.cart_adjustments||{}), value:+e.target.value}}))}
              />
            </Row>
            <Row label="תווית בעגלה (אופציונלי)">
              <Input placeholder="למשל: הנחת סה״כ"
                     value={form.cart_adjustments?.label || ""}
                     onChange={e=>setForm(s=>({...s, cart_adjustments:{...(s.cart_adjustments||{}), label:e.target.value}}))}
              />
            </Row>
            {errors.cart_adjustments && <ErrorMsg>{errors.cart_adjustments}</ErrorMsg>}
          </Card>
        )}

        {/* Bulk Discount – UI בלבד בשלב זה */}
        {form.discount_type === "bulk_discount" && (
          <Card>
            <div className="text-sm text-muted-foreground mb-2">מדרגות כמות → אחוז/סכום. (מימוש חישוב יבוא בהמשך)</div>
            {(form.bulk_adjustments?.ranges||[]).map((r,i)=>(
              <div className="grid grid-cols-5 gap-2 mb-2" key={i}>
                <Field label="מ־"><Input type="number" placeholder="1" value={r.from}
                  onChange={e=>updateRange("bulk_adjustments", i, {from:+e.target.value})}/></Field>
                <Field label="עד"><Input placeholder="ריק = ∞" value={r.to}
                  onChange={e=>updateRange("bulk_adjustments", i, {to:e.target.value})}/></Field>
                <Field label="סוג">
                  <Select value={r.type} onValueChange={v=>updateRange("bulk_adjustments", i, {type:v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">אחוז</SelectItem>
                      <SelectItem value="fixed">סכום קבוע</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ערך"><Input type="number" placeholder="5" value={r.value}
                  onChange={e=>updateRange("bulk_adjustments", i, {value:+e.target.value})}/></Field>
                <Field label="תיאור"><Input placeholder="אופציונלי" value={r.label||""}
                  onChange={e=>updateRange("bulk_adjustments", i, {label:e.target.value})}/></Field>
              </div>
            ))}
            <Button variant="outline" onClick={addBulkRow}>הוסף מדרגה</Button>
            <div className="text-xs text-muted-foreground mt-2">Coming soon: חישוב בפועל בעגלה.</div>
          </Card>
        )}

        {/* Buy X Get Y – UI בלבד בשלב זה */}
        {form.discount_type === "buy_x_get_y" && (
          <Card>
            <div className="text-sm text-muted-foreground mb-2">קנה X קבל Y. (מימוש חישוב יבוא בהמשך)</div>
            {(form.buy_x_get_y_adjustments?.ranges||[]).map((r,i)=>(
              <div className="grid grid-cols-5 gap-2 mb-2" key={i}>
                <Field label="קנה (מ־)">
                  <Input type="number" placeholder="1" value={r.from}
                         onChange={e=>updateRange("buy_x_get_y_adjustments", i, {from:+e.target.value})}/>
                </Field>
                <Field label="כמות מתנה">
                  <Input type="number" placeholder="1" value={r.free_qty}
                         onChange={e=>updateRange("buy_x_get_y_adjustments", i, {free_qty:+e.target.value})}/>
                </Field>
                <Field label="סוג">
                  <Select value={r.free_type || "free_product"}
                          onValueChange={v=>updateRange("buy_x_get_y_adjustments", i, {free_type:v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free_product">מוצר חינם</SelectItem>
                      <SelectItem value="percentage">אחוז הנחה</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ערך (% במידת הצורך)">
                  <Input type="number" placeholder="למשל: 50" value={r.free_value||""}
                         onChange={e=>updateRange("buy_x_get_y_adjustments", i, {free_value:+e.target.value})}/>
                </Field>
                <Field label="מוצרים (IDs)">
                  <Input placeholder="מזהים מופרדים בפסיק" value={(r.products||[]).join(",")}
                         onChange={e=>updateRange("buy_x_get_y_adjustments", i, {products:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
                </Field>
              </div>
            ))}
            <Button variant="outline" onClick={addBxGyRow}>הוסף כלל BXGY</Button>
            <div className="text-xs text-muted-foreground mt-2">Coming soon: חישוב בפועל/הוספת מתנות.</div>
          </Card>
        )}

        {/* Set Price – UI בלבד בשלב זה */}
        {form.discount_type === "set_price" && (
          <Card>
            <div className="text-sm text-muted-foreground mb-2">מחיר כולל לסט. (מימוש חישוב יבוא בהמשך)</div>
            {(form.set_adjustments?.ranges||[]).map((r,i)=>(
              <div className="grid grid-cols-4 gap-2 mb-2" key={i}>
                <Field label="כמות (מ־)">
                  <Input type="number" placeholder="2" value={r.from}
                         onChange={e=>updateRange("set_adjustments", i, {from:+e.target.value})}/>
                </Field>
                <Field label="מחיר כולל">
                  <Input type="number" placeholder="100" value={r.value}
                         onChange={e=>updateRange("set_adjustments", i, {value:+e.target.value})}/>
                </Field>
                <Field label="תיאור">
                  <Input placeholder="אופציונלי" value={r.label||""}
                         onChange={e=>updateRange("set_adjustments", i, {label:e.target.value})}/>
                </Field>
                <div className="self-center text-xs text-muted-foreground">סוג: fixed_set_price</div>
              </div>
            ))}
            <Button variant="outline" onClick={addSetRow}>הוסף כלל סט</Button>
            <div className="text-xs text-muted-foreground mt-2">Coming soon: חישוב בפועל.</div>
          </Card>
        )}
      </section>

      <Separator />

      {/* -------- Conditions (Subtotal בסיסי כרגע) -------- */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold">תנאים</h3>
          <Info className="w-4 h-4 text-muted-foreground" title="לדוגמה: סכום מינימלי בעגלה" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-sm">סכום מינימלי בעגלה</label>
            <Input placeholder="לדוגמה: 200" type="number"
              onChange={e=>{
                const v = e.target.value ? +e.target.value : null;
                let conds = [...(form.conditions||[])].filter(c=>c.type!=="cart_subtotal");
                if (v && v>0) conds.push({type:"cart_subtotal", options:{operator:"greater_than_or_equal", value:v}});
                setField("conditions", conds);
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">אם ריק – ללא תנאי מינימום.</p>
          </div>
          <div className="col-span-2 text-xs text-muted-foreground self-end">
            Coming soon: תנאים לפי Role/כמות פריטים/קטגוריות בעגלה ועוד (כמו אצל Flycart):contentReference[oaicite:7]
          </div>
        </div>
      </section>

      <Separator />

      <RulePreview />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>ביטול</Button>
        <Button onClick={save}>שמירה</Button>
      </div>
    </div>
  );

  function updateRange(key, idx, patch){
    const node = {...(form[key] || {ranges:[]})};
    const ranges = [...(node.ranges || [])];
    ranges[idx] = {...ranges[idx], ...patch};
    node.ranges = ranges;
    setField(key, node);
  }
}

/* ---------- קומפוננטות עזר ---------- */
function Field({ label, children }) {
  return (<div><label className="text-sm">{label}</label>{children}</div>);
}
function Row({ label, children }) {
  return (<div className="flex items-center gap-3 mb-2"><div className="w-40 text-sm">{label}</div><div className="flex-1">{children}</div></div>);
}
function Card({ children }) {
  return <div className="border rounded p-3 space-y-2">{children}</div>;
}
function ErrorMsg({ children }) {
  return (<div className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {children}</div>);
}
