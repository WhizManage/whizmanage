<?php
if (!defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whizmanage_Discount_Functions')) {
class Whizmanage_Discount_Functions
{
    public static function get_table_name()
    {
        return WHIZ_DR_TABLE;
    }

    public static function get_current_time()
    {
        return current_time('mysql');
    }

    public static function is_admin_allowed()
    {
        return current_user_can('manage_woocommerce') || current_user_can('manage_options') || current_user_can('use_whizmanage');
    }

    public static function json_decode($maybe_json)
    {
        if (is_array($maybe_json) || is_object($maybe_json)) {
            return $maybe_json;
        }
        $decoded = json_decode((string) $maybe_json, true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function json_encode($data)
    {
        return wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function parse_datetime($val)
    {
        if (empty($val))
            return null;
        $ts = strtotime($val);
        if (!$ts)
            return null;
        return gmdate('Y-m-d H:i:s', $ts);
    }

    /**
     * מפיק targets ברירת-מחדל מתוך conditions.rules:
     * אם יש כללי subtotal עם scope=categories/products – נשתמש ב-ids שלהם
     * כדי להחיל את ההנחה רק על אותם פריטים.
     */
    public static function get_targets_from_rules($cond): array
    {
        $cond = is_array($cond) ? $cond : [];
        $rules = is_array($cond['rules'] ?? null) ? $cond['rules'] : [];
        $cats = [];
        $prods = [];
        foreach ($rules as $r) {
            if (($r['kind'] ?? '') !== 'subtotal')
                continue;
            $ids = array_map('intval', (array) ($r['ids'] ?? []));
            $scope = $r['scope'] ?? '';
            if ($scope === 'categories')
                $cats = array_merge($cats, $ids);
            if ($scope === 'products')
                $prods = array_merge($prods, $ids);
        }
        return [
            'cats' => array_values(array_unique($cats)),
            'prods' => array_values(array_unique($prods)),
        ];
    }

    public static function expand_term_ids_with_children(array $ids): array
    {
        $out = [];
        foreach ($ids as $id) {
            $id = (int) $id;
            if ($id <= 0)
                continue;
            $out[] = $id;
            $children = get_term_children($id, 'product_cat');
            if (!is_wp_error($children)) {
                foreach ($children as $cid) {
                    $out[] = (int) $cid;
                }
            }
        }
        return array_values(array_unique(array_filter($out)));
    }

    /**
     * בדיקה אם פריט עגלה מתאים לזוג {taxonomy, term_id}
     * תומך בצורה מקסימלית בווריאציות: אם לווריאציה יש ערך ספציפי, הוא קובע ובדיקת האב נמנעת.
     */
    public static function item_has_attribute_term(array $cart_item, string $taxonomy, int $term_id): bool {
        $term_id = (int)$term_id;
        if ($term_id <= 0 || !$taxonomy) return false;

        $product_id = (int)($cart_item['product_id'] ?? 0);
        $variation_id = (int)($cart_item['variation_id'] ?? 0);
        if ($product_id <= 0) return false;

        // שימוש ב-urldecode + trim כדי לא לשבור שמות בעברית
        $taxonomy = trim(urldecode($taxonomy));
        $is_pa = (strpos($taxonomy, 'pa_') === 0);

        // 1. קבלת אובייקט המוצר והAttributes שלו לבדיקת קיום התכונה
        // אנו חייבים לבדוק אם התכונה *באמת* משויכת למוצר כדי למנוע מצב של "שאריות" במסד הנתונים
        $target_product = wc_get_product($variation_id > 0 ? $variation_id : $product_id);
        if (!$target_product) return false;

        // אם זו ווריאציה, האב הוא זה שמחזיק את רשימת התכונות המלאה (כולל גלובליות)
        $parent = null;
        if ($target_product->is_type('variation')) {
            $parent = wc_get_product($target_product->get_parent_id());
            $attributes = $parent ? $parent->get_attributes() : [];
        } else {
            $attributes = $target_product->get_attributes();
        }

        // בדיקה: האם התכונה קיימת ברשימת התכונות של המוצר?
        // wc_get_product_term_ids עלול להחזיר מונחים גם אם התכונה נמחקה מהמוצר אך נשארה ב-DB.
        $attr_key = sanitize_title($taxonomy);
        $attr_exists = isset($attributes[$taxonomy]) || isset($attributes[$attr_key]);
        
        if ($is_pa && !$attr_exists) {
            return false; // התכונה לא מוגדרת במוצר זה -> התעלם ממונחים יתומים
        }

        // 2. בדיקה האם זו ווריאציה עם ערך ספציפי לתכונה הזו
        if ($variation_id > 0) {
            $attr_meta_key = 'attribute_' . $taxonomy;
            // בדיקת meta ישירה
            $val = get_post_meta($variation_id, $attr_meta_key, true); // true מחזיר מחרוזת בודדת או ריק

            if ($val !== '' && $val !== null) {
                if ($is_pa) {
                    $term = get_term_by('slug', $val, $taxonomy);
                    return ($term && !is_wp_error($term) && (int)$term->term_id === $term_id);
                }
                return false;
            }

            // אם הגענו לפה, הערך הוא "Any" (ריק).
            // אנו בודקים האם התכונה משמשת לווריאציות.
            $is_variation_attr = false;
             if (isset($attributes[$taxonomy]) && $attributes[$taxonomy]->get_variation()) {
                $is_variation_attr = true;
            } elseif (isset($attributes[$attr_key]) && $attributes[$attr_key]->get_variation()) {
                $is_variation_attr = true;
            }

            if ($is_variation_attr) {
                // התכונה משמשת לווריאציות, אבל לווריאציה הספציפית הזו אין ערך (Any).
                // לכן היא לא תואמת פילטר "שחור" ספציפי.
                return false;
            }
        }

        // 3. fallback לבדיקת מונחים (עבור מוצר פשוט או תכונה גלובלית שאינה ווריאציה)
        // כעת זה בטוח כי כבר וידאנו שהתכונה קיימת ב-$attributes
        if ($is_pa) {
            // אם זו ווריאציה, אנחנו רוצים לבדוק את ה-Parent TERMS
            $check_id = ($parent) ? $parent->get_id() : $target_product->get_id();
            $ids = array_map('intval', (array) wc_get_product_term_ids($check_id, $taxonomy));
            return in_array($term_id, $ids, true);
        }

        return false;
    }

    public static function item_matches_any_attribute_pair(array $cart_item, array $pairs): bool {
        foreach ($pairs as $p) {
            $tax = $p['taxonomy'] ?? '';
            $tid = (int)($p['term_id'] ?? 0);
            if ($tax && $tid > 0 && self::item_has_attribute_term($cart_item, $tax, $tid)) {
                return true;
            }
        }
        return false;
    }

    public static function product_has_attribute_term(int $product_id, string $taxonomy, int $term_id): bool {
        $term_id = (int)$term_id;
        if ($term_id <= 0 || !$taxonomy) return false;

        $target_product = wc_get_product($product_id);
        if (!$target_product) return false;

        // שימוש ב-urldecode + trim כדי לא לשבור שמות בעברית
        $taxonomy = trim(urldecode($taxonomy));
        $is_pa = (strpos($taxonomy, 'pa_') === 0);

        // 1. קבלת רשימת התכונות "האמיתית" כדי לסנן יתומים
        $parent = null;
        if ($target_product->is_type('variation')) {
            $parent = wc_get_product($target_product->get_parent_id());
            $attributes = $parent ? $parent->get_attributes() : [];
        } else {
            $attributes = $target_product->get_attributes();
        }

        $attr_key = sanitize_title($taxonomy);
        $attr_exists = isset($attributes[$taxonomy]) || isset($attributes[$attr_key]);
        
        if ($is_pa && !$attr_exists) {
            return false;
        }

        // 2. אם זו ווריאציה, נבדוק את ה-Meta הישיר שלה
        if ($target_product->is_type('variation')) {
            $val = get_post_meta($target_product->get_id(), 'attribute_' . $taxonomy, true);
            if ($val !== '' && $val !== null) {
                if ($is_pa) {
                    $term = get_term_by('slug', $val, $taxonomy);
                    return ($term && !is_wp_error($term) && (int)$term->term_id === $term_id);
                }
                return false;
            }
            
            // בדיקת "Any"
            $is_variation_attr = false;
            if (isset($attributes[$taxonomy]) && $attributes[$taxonomy]->get_variation()) {
                $is_variation_attr = true;
            } elseif (isset($attributes[$attr_key]) && $attributes[$attr_key]->get_variation()) {
                $is_variation_attr = true;
            }

            if ($is_variation_attr) {
                return false; // Any != Specific Term
            }
        }

        // 3. Fallback לבדיקת מונחים
        if ($is_pa) {
            $check_id = ($parent) ? $parent->get_id() : $target_product->get_id();
            $ids = array_map('intval', (array) wc_get_product_term_ids($check_id, $taxonomy));
            return in_array($term_id, $ids, true);
        }

        return false;
    }
}
}
