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
     * תומך גם בווריאציות כאשר המפתח הוא attribute_{taxonomy} והערך הוא slug של ה-term.
     */
    public static function item_has_attribute_term(array $cart_item, string $taxonomy, int $term_id): bool {
        $term_id = (int)$term_id;
        if ($term_id <= 0 || !$taxonomy) return false;

        $taxonomy = sanitize_key($taxonomy);
        if (strpos($taxonomy, 'pa_') !== 0) $taxonomy = 'pa_' . $taxonomy;

        $pid = (int)($cart_item['product_id'] ?? 0);
        $vid = (int)($cart_item['variation_id'] ?? 0);

        // נסה קודם לפי בחירת הווריאציה (attribute_{taxonomy} => slug)
        $variation = is_array($cart_item['variation'] ?? null) ? $cart_item['variation'] : [];
        $attr_key = 'attribute_' . $taxonomy;
        if (!empty($variation[$attr_key])) {
            $slug = sanitize_title($variation[$attr_key]);
            $term = get_term_by('slug', $slug, $taxonomy);
            if ($term && !is_wp_error($term) && (int)$term->term_id === $term_id) {
                return true;
            }
        }

        // אם לא נמצא בווריאציה, בדוק מוצרים מקושרים
        if ($vid > 0) {
            $ids = array_map('intval', (array) wc_get_product_term_ids($vid, $taxonomy));
            if (in_array($term_id, $ids, true)) return true;
        }
        if ($pid > 0) {
            $ids = array_map('intval', (array) wc_get_product_term_ids($pid, $taxonomy));
            if (in_array($term_id, $ids, true)) return true;
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
        $taxonomy = sanitize_key($taxonomy);
        if (strpos($taxonomy, 'pa_') !== 0) $taxonomy = 'pa_' . $taxonomy;
        $ids = array_map('intval', (array) wc_get_product_term_ids($product_id, $taxonomy));
        return in_array((int)$term_id, $ids, true);
    }
}
}
