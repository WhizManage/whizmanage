<?php
if (!defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whizmanage_Discount_Shortcode')) {
/** Allow rule to apply even when product already has a sale price */
if (!defined('WHIZ_DR_FORCE_RULE_ON_SALE')) {
    define('WHIZ_DR_FORCE_RULE_ON_SALE', true);
}

class Whizmanage_Discount_Shortcode
{
    /**
     * initializes hooks
     */
    public static function init() {
         // Remove any previous hook to avoid duplicates
        remove_filter('woocommerce_get_price_html', __CLASS__ . '::price_html_sale_on_pdp', 20);
        add_filter('woocommerce_get_price_html', __CLASS__ . '::price_html_sale_on_pdp', 20, 2);

        add_filter('woocommerce_available_variation', __CLASS__ . '::variation_data_on_pdp', 20, 3);
        
        remove_action('woocommerce_single_product_summary', 'whiz_dr_render_savings_banner_minimal_buy_at', 22);
        remove_action('woocommerce_single_product_summary', 'whiz_dr_render_bogo_banner_on_pdp', 23);
        remove_action('woocommerce_single_product_summary', 'whiz_dr_render_bxgy_banner_on_pdp', 24);
        remove_action('woocommerce_single_product_summary', 'whiz_dr_render_universal_discount_banner', 25);

        // Hook 1: Standard WooCommerce hook (works with most themes)
        add_action('woocommerce_single_product_summary', __CLASS__ . '::render_universal_discount_banner', 25);
        
        // Hook 2: Before single product (fallback for themes that don't use summary hook)
        add_action('woocommerce_before_single_product', __CLASS__ . '::render_universal_discount_banner_fallback', 25);
        
        // Hook 3: After single product summary (another fallback position)
        add_action('woocommerce_after_single_product_summary', __CLASS__ . '::render_universal_discount_banner_fallback', 5);
        
        // Shortcode support for manual placement
        add_shortcode('whiz_discount_message', __CLASS__ . '::render_discount_message_shortcode');

        add_action('wp_footer', __CLASS__ . '::output_footer_scripts');
        add_action('wp_head', __CLASS__ . '::output_header_styles');
    }

    /**
     * Checks if a rule applies to a given product by include/exclude lists and targeting.
     * CRITICAL: This must be 100% consistent with cart logic
     */
    public static function rule_applies_to_product(array $rule, int $product_id): bool
    {
        if ($product_id <= 0)
            return false;

        $cond = Whizmanage_Discount_Functions::json_decode($rule['conditions'] ?? []);
        $actions = Whizmanage_Discount_Functions::json_decode($rule['actions'] ?? []);
        $type = $rule['type'] ?? '';

        // 🔹 CRITICAL: Check filters first (must match cart logic exactly)
        $filters = Whizmanage_Discount_Functions::json_decode($rule['filters'] ?? []);
        if (!empty($filters)) {
            $prod = wc_get_product($product_id);
            if (!$prod)
                return false;

            foreach ($filters as $f) {
                $field = isset($f['field']) ? sanitize_key($f['field']) : '';
                $op = (isset($f['op']) && in_array($f['op'], ['include', 'exclude'], true)) ? $f['op'] : 'include';
                $values = (array) ($f['values'] ?? []);

                if ($field === '' || empty($values)) {
                    continue;
                }

                $passes = true;

                switch ($field) {
                    case 'categories':
                        $vals = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', $values));
                        $prod_cats = array_map('intval', (array) wc_get_product_term_ids($product_id, 'product_cat'));
                        $has = (bool) array_intersect($vals, $prod_cats);
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    case 'products':
                        $vals = array_map('intval', $values);
                        $has = in_array($product_id, $vals, true);
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    case 'tags':
                        $vals = array_map('intval', $values);
                        $prod_tags = array_map('intval', (array) wc_get_product_term_ids($product_id, 'product_tag'));
                        $has = (bool) array_intersect($vals, $prod_tags);
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    case 'skus':
                        $needles = array_map('strtolower', array_map('strval', $values));
                        $sku = $prod ? strtolower((string) $prod->get_sku()) : '';
                        $has = ($sku !== '' && in_array($sku, $needles, true));
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    case 'attributes':
                        $has = false;
                        foreach ($values as $pair) {
                            if (!is_array($pair)) continue;
                            $tax = $pair['taxonomy'] ?? '';
                            $tid = (int) ($pair['term_id'] ?? 0);
                            if ($tax && $tid > 0 && Whizmanage_Discount_Functions::product_has_attribute_term($product_id, $tax, $tid)) {
                                $has = true;
                                break;
                            }
                        }
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    case 'user_roles':
                        $user = wp_get_current_user();
                        $uRoles = $user->exists() ? (array) $user->roles : [];
                        $vals = array_map('strval', $values);
                        $has = (bool) array_intersect($vals, $uRoles);
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    case 'on_sale':
                        $has = $prod ? $prod->is_on_sale() : false;
                        $passes = ($op === 'exclude') ? !$has : $has;
                        break;

                    default:
                        $passes = true;
                }

                // AND logic - all filters must pass
                if (!$passes) {
                    return false;
                }
            }
        }

        $prod = wc_get_product($product_id);
        if (!$prod)
            return false;

        // === EXCLUDE CHECKS (immediate disqualification) ===

        // Exclude by IDs
        $exclude_pids = array_map('intval', (array) ($cond['exclude_product_ids'] ?? []));
        if (in_array($product_id, $exclude_pids, true))
            return false;

        // Exclude by categories
        $exclude_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['exclude_product_cat_ids'] ?? [])));
        if (!empty($exclude_cats)) {
            $prod_cats = array_map('intval', (array) wc_get_product_term_ids($product_id, 'product_cat'));
            if (array_intersect($exclude_cats, $prod_cats))
                return false;
        }

        // Exclude by tags
        $exclude_tags = array_map('intval', (array) ($cond['exclude_product_tag_ids'] ?? []));
        if (!empty($exclude_tags)) {
            $prod_tags = array_map('intval', (array) wc_get_product_term_ids($product_id, 'product_tag'));
            if (array_intersect($exclude_tags, $prod_tags)) {
                return false;
            }
        }

        // Exclude by SKU
        $exclude_skus = array_map('strtolower', array_map('strval', (array) ($cond['exclude_product_skus'] ?? [])));
        if (!empty($exclude_skus)) {
            $sku = strtolower((string) $prod->get_sku());
            if ($sku !== '' && in_array($sku, $exclude_skus, true)) {
                return false;
            }
        }

        // Exclude by attributes
        $attr_excludes = is_array(($cond['exclude_attribute_terms'] ?? null)) ? $cond['exclude_attribute_terms'] : [];
        foreach ($attr_excludes as $p) {
            $tax = $p['taxonomy'] ?? '';
            $tid = (int) ($p['term_id'] ?? 0);
            if ($tax && $tid > 0 && Whizmanage_Discount_Functions::product_has_attribute_term($product_id, $tax, $tid)) {
                return false;
            }
        }

        // Exclude on-sale products
        $exclude_on_sale = !empty($cond['exclude_on_sale']);
        if ($exclude_on_sale && $prod->is_on_sale())
            return false;

        // === INCLUDE CHECKS (must match at least one if specified) ===

        $has_include_criteria = false;
        $matches_include = false;

        // Include by IDs
        $include_pids = array_map('intval', (array) ($cond['product_ids'] ?? []));
        if (!empty($include_pids)) {
            $has_include_criteria = true;
            if (in_array($product_id, $include_pids, true))
                $matches_include = true;
        }

        // Include by categories
        $include_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['product_cat_ids'] ?? [])));
        if (!empty($include_cats)) {
            $has_include_criteria = true;
            $prod_cats = array_map('intval', (array) wc_get_product_term_ids($product_id, 'product_cat'));
            if (array_intersect($include_cats, $prod_cats))
                $matches_include = true;
        }

        // Include by tags
        $include_tags = array_map('intval', (array) ($cond['product_tag_ids'] ?? []));
        if (!empty($include_tags)) {
            $has_include_criteria = true;
            $prod_tags = array_map('intval', (array) wc_get_product_term_ids($product_id, 'product_tag'));
            if (array_intersect($include_tags, $prod_tags)) {
                $matches_include = true;
            }
        }

        // Include by SKU
        $include_skus = array_map('strtolower', array_map('strval', (array) ($cond['product_skus'] ?? [])));
        if (!empty($include_skus)) {
            $has_include_criteria = true;
            $sku = strtolower((string) $prod->get_sku());
            if ($sku !== '' && in_array($sku, $include_skus, true)) {
                $matches_include = true;
            }
        }

        // Include by attributes
        $attr_includes = is_array(($cond['attribute_terms'] ?? null)) ? $cond['attribute_terms'] : [];
        if (!empty($attr_includes)) {
            $has_include_criteria = true;
            foreach ($attr_includes as $p) {
                $tax = $p['taxonomy'] ?? '';
                $tid = (int) ($p['term_id'] ?? 0);
                if ($tax && $tid > 0 && Whizmanage_Discount_Functions::product_has_attribute_term($product_id, $tax, $tid)) {
                    $matches_include = true;
                    break;
                }
            }
        }

        // Require on-sale
        $require_on_sale = !empty($cond['require_on_sale']);
        if ($require_on_sale) {
            if (!$prod->is_on_sale())
                return false;
        }

        // If we have include criteria, product MUST match at least one
        if ($has_include_criteria && !$matches_include)
            return false;

        // === RULE-TYPE SPECIFIC TARGETING ===

        if ($type === 'bogo_discount') {
            $targets = array_map('intval', (array) ($actions['target_product_ids'] ?? []));
            if (!empty($targets) && !in_array($product_id, $targets, true))
                return false;
        }

        if ($type === 'bxgy_discount') {
            $buy_ids = array_map('intval', (array) ($actions['buy_product_ids'] ?? []));
            $get_ids = array_map('intval', (array) ($actions['get_product_ids'] ?? []));
            if (!empty($buy_ids) || !empty($get_ids)) {
                if (!in_array($product_id, $buy_ids, true) && !in_array($product_id, $get_ids, true))
                    return false;
            }
        }

        return true;
    }

    /* ==========================================================================
       UNIVERSAL RULE FINDER & BANNER (New Unified System)
       ========================================================================== */

    /**
     * מציאת החוק הראשון שחל על המוצר (מכל סוג שהוא: Bulk, BOGO, Cart, Product וכו')
     */
    public static function get_first_applicable_rule(int $product_id): ?array
    {
        if ($product_id <= 0) {
            return null;
        }

        global $wpdb;

        $now   = current_time('mysql');
        $table = esc_sql(WHIZ_DR_TABLE); // קבוע פנימי, לא קלט משתמש

        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter -- Checked and safe.
        // phpcs:ignore PluginCheck.Security.DirectDB.UnescapedDBParameter
        $sql = "
        SELECT *
        FROM `{$table}`
        WHERE status = %s
          AND (start_date IS NULL OR start_date <= %s)
          AND (end_date   IS NULL OR end_date   >= %s)
        ORDER BY priority ASC, id DESC
    ";

        $rows = $wpdb->get_results(
            // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
            $wpdb->prepare($sql, 'publish', $now, $now),
            ARRAY_A
        );


        if (empty($rows))
            return null;

        foreach ($rows as $row) {
            // בדיקה האם החוק חל על המוצר הספציפי הזה
            if (self::rule_applies_to_product($row, $product_id)) {

                $cond = Whizmanage_Discount_Functions::json_decode($row['conditions'] ?? []);

                // בדיקת תפקיד משתמש (Exclude)
                $exclude_roles = array_filter((array) ($cond['user_roles_exclude'] ?? []));
                if (!empty($exclude_roles)) {
                    if (!is_user_logged_in())
                        continue;
                    $user = wp_get_current_user();
                    if (array_intersect((array) $user->roles, $exclude_roles))
                        continue;
                }

                // בדיקת תפקיד משתמש (Include)
                if (!empty($cond['user_roles'])) {
                    if (!is_user_logged_in())
                        continue;
                    $user = wp_get_current_user();
                    if (!array_intersect((array) $user->roles, (array) $cond['user_roles']))
                        continue;
                }

                // מצאנו חוק תקין שחל על המוצר והמשתמש
                return $row;
            }
        }

        return null;
    }

    /**
     * Returns the base amount M to display on PDP:
     */
    public static function get_base_amount_for_pdp(WC_Product $product, string $which = 'min'): float
    {
        if ($product->is_type('variable')) {
            $sale = (float) $product->get_variation_sale_price($which, false);
            if ($sale > 0)
                return $sale;
            return (float) $product->get_variation_regular_price($which, false);
        }

        $sale = $product->get_sale_price();
        if ($sale !== '' && $sale !== null && (float) $sale > 0)
            return (float) $sale;

        return (float) $product->get_regular_price();
    }

    /** Applies an adjustment to an amount (percentage or fixed). */
    public static function apply_adj_to_amount(float $amount, array $adj): float
    {
        if ($amount <= 0)
            return 0;

        if (($adj['method'] ?? 'percentage') === 'percentage') {
            $pct = max(0, min(100, (float) ($adj['value'] ?? 0)));
            $new = $amount * (1 - $pct / 100);
            return max(0, $new);
        }

        $fixed = max(0, (float) ($adj['value'] ?? 0));
        return max(0, $amount - $fixed);
    }

    /* === 1) Price Strike-through HTML (Only for product_adjustment rules) === */

    public static function price_html_sale_on_pdp($price_html, $product)
    {
        // Safety checks
        if (is_admin() && !wp_doing_ajax())
            return $price_html;
        if (!$product || !is_a($product, 'WC_Product'))
            return $price_html;
        if (!function_exists('is_product') || !is_product())
            return $price_html;

        $product_id = (int) $product->get_id();
        if ($product_id <= 0)
            return $price_html;

        // שימוש במאתר האוניברסלי
        $rule = self::get_first_applicable_rule($product_id);

        // אם אין חוק, או שהחוק הוא לא מסוג שמשנה מחיר מוצר ישירות - מחזירים רגיל
        // (BOGO, Bulk, Cart - לא משנים מחיר ויזואלית לפני העגלה, אלא רק מציגים בנר)
        if (!$rule || ($rule['type'] ?? '') !== 'product_adjustment') {
            return $price_html;
        }

        // בדיקה שאין תנאי כמות (min_qty) שמונעים הצגת מחיר מוזל מראש
        $cond = Whizmanage_Discount_Functions::json_decode($rule['conditions'] ?? []);
        if (!empty($cond['rules']))
            return $price_html;
        if (!empty($cond['min_qty']) && (int) $cond['min_qty'] > 0)
            return $price_html;

        $a = Whizmanage_Discount_Functions::json_decode($rule['actions'] ?? []);
        $adj = [
            'method' => $a['method'] ?? 'percentage',
            'value' => (float) ($a['value'] ?? 0)
        ];

        if ($adj['value'] <= 0)
            return $price_html;

        // מכאן והלאה הלוגיקה זהה לחישוב הקודם
        if ($product->is_type('variable')) {
            $base_min = self::get_base_amount_for_pdp($product, 'min');
            $base_max = self::get_base_amount_for_pdp($product, 'max');

            if ($base_min <= 0 && $base_max <= 0)
                return $price_html;

            $after_min = self::apply_adj_to_amount($base_min, $adj);
            $after_max = self::apply_adj_to_amount($base_max, $adj);

            $base_min_d = wc_get_price_to_display($product, ['price' => $base_min]);
            $base_max_d = wc_get_price_to_display($product, ['price' => $base_max]);
            $after_min_d = wc_get_price_to_display($product, ['price' => $after_min]);
            $after_max_d = wc_get_price_to_display($product, ['price' => $after_max]);

            $eps = 1e-6;
            if ($after_min_d >= $base_min_d - $eps && $after_max_d >= $base_max_d - $eps)
                return $price_html;

            $base_str = (abs($base_min_d - $base_max_d) < $eps)
                ? wc_price($base_min_d)
                : wc_format_price_range($base_min_d, $base_max_d);

            $after_str = (abs($after_min_d - $after_max_d) < $eps)
                ? wc_price($after_min_d)
                : wc_format_price_range($after_min_d, $after_max_d);

            return '<del>' . $base_str . '</del> <ins>' . $after_str . '</ins>' . $product->get_price_suffix();
        }

        $base = self::get_base_amount_for_pdp($product, 'min');
        if ($base <= 0)
            return $price_html;

        $after = self::apply_adj_to_amount($base, $adj);
        $base_disp = wc_get_price_to_display($product, ['price' => $base]);
        $after_disp = wc_get_price_to_display($product, ['price' => $after]);

        if ($after_disp >= $base_disp - 1e-6)
            return $price_html;

        return wc_format_sale_price($base_disp, $after_disp) . $product->get_price_suffix();
    }

    /**
     * Variation data on PDP (Updated to use Universal logic)
     */
     public static function variation_data_on_pdp($data, $variable_product, $variation) {
        if (is_admin() && !wp_doing_ajax())
            return $data;

        $product_id = (int) $variable_product->get_id();
        if ($product_id <= 0)
            return $data;

        // שימוש במאתר האוניברסלי - שימוש ב-ID של הווריאציה עצמה למציאת החוק המתאים
        $rule = self::get_first_applicable_rule($variation->get_id());

        // רק אם סוג החוק הוא product_adjustment
        if (!$rule || ($rule['type'] ?? '') !== 'product_adjustment')
            return $data;

        // בדיקת min_qty
        $cond = Whizmanage_Discount_Functions::json_decode($rule['conditions'] ?? []);
        if (!empty($cond['rules']) || (!empty($cond['min_qty']) && (int) $cond['min_qty'] > 0))
            return $data;

        $a = Whizmanage_Discount_Functions::json_decode($rule['actions'] ?? []);
        $adj = [
            'method' => $a['method'] ?? 'percentage',
            'value' => (float) ($a['value'] ?? 0)
        ];

        $base = $variation->get_price();
        if ($base === '' || $base === null)
            return $data;
        $base = (float) $base;
        if ($base <= 0)
            return $data;

        $after = self::apply_adj_to_amount($base, $adj);
        $base_d = wc_get_price_to_display($variation, ['price' => $base]);
        $after_d = wc_get_price_to_display($variation, ['price' => $after]);

        if ($after_d >= $base_d - 1e-6)
            return $data;

        $data['price_html'] = wc_format_sale_price($base_d, $after_d) . $variation->get_price_suffix();
        $data['display_regular_price'] = $base_d;
        $data['display_price'] = $after_d;

        return $data;
    }


    /* === 2) UNIVERSAL BANNER DISPLAY === */

    /**
     * הפונקציה הזו מציגה בנר הודעה לכל סוגי ההנחות (Bulk, BOGO, Cart Adjustment וכו')
     * זוהי הפונקציה הראשית שנקראת מההוק הסטנדרטי
     */
    public static function render_universal_discount_banner()
    {
        // מניעת הצגה כפולה - בודקים אם כבר הוצג
        static $already_rendered = false;
        if ($already_rendered) {
            return;
        }
        
        if (is_admin() && !wp_doing_ajax())
            return;
        if (!function_exists('is_product') || !is_product())
            return;

        global $product;
        if (!$product || !is_a($product, 'WC_Product'))
            return;

        $product_id = (int) $product->get_id();
        
        // קריאה לפונקציה המשותפת שמציגה את ההודעה
        $rendered = self::render_discount_message_html($product_id);
        
        if ($rendered) {
            $already_rendered = true;
        }
    }
    
    /**
     * פונקציית fallback שמציגה את ההודעה אם עדיין לא הוצגה
     * נקראת מהוקים נוספים לתמיכה בתבניות שונות
     */
    public static function render_universal_discount_banner_fallback()
    {
        // בודקים אם כבר הוצג הבנר על ידי ההוק הראשי
        static $already_rendered = false;
        if ($already_rendered) {
            return;
        }
        
        if (is_admin() && !wp_doing_ajax())
            return;
        if (!function_exists('is_product') || !is_product())
            return;

        global $product;
        if (!$product || !is_a($product, 'WC_Product'))
            return;

        $product_id = (int) $product->get_id();
        
        // בודקים אם הבנר כבר קיים בדף (למקרה שההוק הראשי כבר עבד)
        ?>
        <script>
            if (document.getElementById('whiz-universal-banner')) {
                // הבנר כבר קיים, לא צריך להציג שוב
            } else {
                // הבנר לא קיים, נציג אותו
                <?php 
                $rendered = self::render_discount_message_html($product_id);
                if ($rendered) {
                    $already_rendered = true;
                }
                ?>
            }
        </script>
        <?php
    }
    
    /**
     * Shortcode להצגת הודעת ההנחה במיקום ידני
     * שימוש: [whiz_discount_message]
     */
    public static function render_discount_message_shortcode($atts)
    {
        if (is_admin() && !wp_doing_ajax())
            return '';
        if (!function_exists('is_product') || !is_product())
            return '';

        global $product;
        if (!$product || !is_a($product, 'WC_Product'))
            return '';

        $product_id = (int) $product->get_id();
        
        ob_start();
        self::render_discount_message_html($product_id);
        return ob_get_clean();
    }
    
    /**
     * הפונקציה המשותפת שמציגה את HTML של הודעת ההנחה
     * @param int $product_id
     * @return bool האם הוצגה הודעה
     */
    private static function render_discount_message_html($product_id)
    {
        if ($product_id <= 0) {
            return false;
        }
        
        global $product;
        if (!$product || !is_a($product, 'WC_Product'))
            return false;

        // 1. מציאת החוק הרלוונטי
        $rule = self::get_first_applicable_rule($product_id);
        if (!$rule)
            return false;

        // --- השינוי החדש: בדיקת המתג ---
        // אם show_message הוא '0' או false - יוצאים מיד ולא מציגים כלום
        if (isset($rule['show_message']) && empty($rule['show_message'])) {
            return false;
        }
        // 2. חילוץ נתונים
        $actions = Whizmanage_Discount_Functions::json_decode($rule['actions'] ?? []);
        $type = $rule['type'] ?? '';

        // 3. קביעת ההודעה להצגה
        // עדיפות עליונה: הודעה שכתובה בחוק עצמו
        $message = isset($rule['message']) ? trim($rule['message']) : '';

        // אם אין הודעה מוגדרת בחוק, יוצרים הודעה גנרית לפי סוג החוק
        if ($message === '') {
            switch ($type) {
                case 'product_adjustment':
                case 'cart_adjustment':
                    $val    = floatval($actions['value'] ?? 0);
                    $method = $actions['method'] ?? 'percentage';

                    if ($method === 'percentage') {
                        $message = sprintf(
                            /* translators: %s: discount percentage */
                            __('Special Offer: Get %s%% off this item!', 'whizmanage'),
                            $val
                        );
                    } else {
                        $message = __('Special Offer: Discount on this item!', 'whizmanage');
                    }
                    break;

                case 'bulk_discount':
                    $tiers = $actions['tiers'] ?? [];
                    if (!empty($tiers) && is_array($tiers)) {
                        usort($tiers, function ($a, $b) {
                            return ($a['min'] ?? 0) <=> ($b['min'] ?? 0);
                        });

                        $first_tier = $tiers[0];
                        $min        = $first_tier['min'] ?? 1;
                        $amt        = floatval($first_tier['amount'] ?? 0);
                        $method     = $first_tier['method'] ?? 'percentage';

                        if ($method === 'percentage') {
                            $message = sprintf(
                                /* translators: 1: minimum quantity, 2: discount percentage */
                                __('Buy %1$d+ items, get %2$s%% off!', 'whizmanage'),
                                $min,
                                $amt
                            );
                        } else {
                            $message = sprintf(
                                /* translators: 1: minimum quantity, 2: discount amount (formatted price) */
                                __('Buy %1$d+ items, get %2$s discount!', 'whizmanage'),
                                $min,
                                wc_price($amt)
                            );
                        }
                    } else {
                        $message = __('Quantity Discount Available! Buy more to save more.', 'whizmanage');
                    }
                    break;

                case 'bogo_discount':
                    $x   = $actions['x_qty'] ?? 1;
                    $y   = $actions['y_qty'] ?? 1;
                    $pct = floatval($actions['discount_pct'] ?? 0);

                    if ($pct >= 100) {
                        $message = sprintf(
                            /* translators: 1: quantity to buy, 2: quantity free */
                            __('Buy %1$d Get %2$d FREE!', 'whizmanage'),
                            $x,
                            $y
                        );
                    } else {
                        $message = sprintf(
                            /* translators: 1: quantity to buy, 2: quantity discounted, 3: discount percentage */
                            __('Buy %1$d Get %2$d at %3$s%% off!', 'whizmanage'),
                            $x,
                            $y,
                            $pct
                        );
                    }
                    break;

                case 'bxgy_discount':
                    $x   = $actions['x_qty'] ?? 1;
                    $y   = $actions['y_qty'] ?? 1;
                    $pct = floatval($actions['discount_pct'] ?? 0);

                    if ($pct >= 100) {
                        $message = sprintf(
                            /* translators: 1: quantity to buy, 2: quantity free */
                            __('Bundle Deal: Buy %1$d get %2$d FREE!', 'whizmanage'),
                            $x,
                            $y
                        );
                    } else {
                        $message = sprintf(
                            /* translators: 1: quantity to buy, 2: quantity discounted, 3: discount percentage */
                            __('Bundle Deal: Buy %1$d get %2$d at %3$s%% off!', 'whizmanage'),
                            $x,
                            $y,
                            $pct
                        );
                    }
                    break;

                case 'shipping_discount':
                    $message = __('Free Shipping eligible with this product!', 'whizmanage');
                    break;

                case 'spend_bundle':
                    $message = __('Spend Bundle: Special offer available!', 'whizmanage');
                    break;

                default:
                    $message = __('Special discount applicable to this product!', 'whizmanage');
                    break;
            }
        }


        // 4. החלפת טוקנים בסיסיים
        if (strpos($message, '{') !== false) {
            $price = (float) $product->get_price();
            $message = str_replace('{price_before}', wc_price($price), $message);

            // חישוב בסיסי לטוקנים אם אפשרי
            if (in_array($type, ['product_adjustment', 'cart_adjustment'])) {
                $method = $actions['method'] ?? 'percentage';
                $val = floatval($actions['value'] ?? 0);
                $after = $price;
                if ($method === 'percentage') {
                    $after = $price * (1 - ($val / 100));
                    $message = str_replace('{save_pct}', $val, $message);
                } elseif ($method === 'fixed') {
                    $after = max(0, $price - $val);
                    $message = str_replace('{save_amount}', wc_price($val), $message);
                }
                $message = str_replace('{price_after}', wc_price($after), $message);
            }
        }

        // 5. הדפסת ההודעה
        // ניתן לשנות את העיצוב (Style) כאן
    ?>
        <div id="whiz-universal-banner" class="whiz-discount-message" data-rule-type="<?php echo esc_attr($type); ?>"
            style="margin:10px 0; padding:10px; background:#f0f8ff; border:1px solid #1f7a8c; border-left-width:5px; border-radius:4px; color:#0d3c61; font-weight:600;">
            <span class="whiz-msg-icon" style="margin-right:5px;">🏷️</span>
            <span class="whiz-msg-text"><?php echo wp_kses_post($message); ?></span>
            <?php if ($type !== 'product_adjustment' && $type !== 'cart_adjustment'): ?>
                <div style="font-size:0.85em; opacity:0.8; margin-top:4px;">
                    <?php esc_html_e('Discount applied in cart', 'whizmanage'); ?>
                </div>
            <?php endif; ?>
        </div>
    <?php
        return true;
    }

    
    /* === 3) CSS/JS Helpers === */
    public static function output_footer_scripts() {
        if (!function_exists('is_product') || !is_product())
            return;
    ?>
        <script>
            // Simple script to handle Price Strikethrough updates on variation change
            // Note: The universal banner text is static in this version.
            jQuery(function($) {
                $('form.variations_form').on('found_variation', function(e, v) {
                    if (!v) return;
                    // Update main price html
                    if (v.price_html) {
                        $('.summary .price').first().html(v.price_html);
                    }
                });

                $('form.variations_form').on('reset_data', function() {
                    var $mainPrice = $('.summary .price').first();
                    var originalPrice = $mainPrice.data('original-price');
                    if (!originalPrice && $mainPrice.length) {
                        $mainPrice.data('original-price', $mainPrice.html());
                        return;
                    }
                    if (originalPrice) {
                        $mainPrice.html(originalPrice);
                    }
                });
            });
        </script>
    <?php
    }

    public static function output_header_styles() {
        if (!function_exists('is_product') || !is_product())
            return;
    ?>
        <style>
            .single_variation_wrap .woocommerce-variation-price {
                display: none !important;
            }

            .summary .price {
                display: block !important;
            }
        </style>
    <?php
    }
}
}