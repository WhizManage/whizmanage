<?php
if (!defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whiz_Discount_Manager')) {
    class Whiz_Discount_Manager
    {
        /** Guard כדי לא להיכנס ללולאה כאשר מוסיפים/מסירים שורות מתנה */
        protected static $syncing_bogo_gifts = false;
        protected static $as_coupon_total = 0.0;
        protected static $as_coupon_labels = [];

        /* =========================
     * Public entry points
     * ========================= */

        /** מעקב אחרי מתנות שהוסרו ידנית ע"י המשתמש */
        public static function track_rejected_gift($cart_item_key, $cart)
        {
            if (empty($cart->removed_cart_contents[$cart_item_key])) {
                return;
            }
            $item = $cart->removed_cart_contents[$cart_item_key];

            // אם זה לא מתנה שלנו – התעלם
            if (empty($item['whiz_dr_gift'])) {
                return;
            }

            if (!function_exists('WC') || !WC()->session) {
                return;
            }

            $pid = (int)($item['product_id'] ?? 0);
            $vid = (int)($item['variation_id'] ?? 0);
            $var = is_array($item['variation'] ?? null) ? $item['variation'] : [];

            // יצירת חתימה לזיהוי המתנה
            $sig = $pid . '|' . $vid . '|' . md5(json_encode($var));

            // שמירה בסשן
            $rejected = (array)WC()->session->get('whiz_dr_rejected_gifts', []);
            $rejected[$sig] = time(); // שומרים timestamp למקרה שנרצה תוקף
            WC()->session->set('whiz_dr_rejected_gifts', $rejected);
        }

        /** בדיקה האם מתנה נדחתה */
        protected static function is_gift_rejected($pid, $vid, $var): bool
        {
            if (!function_exists('WC') || !WC()->session) {
                return false;
            }
            $rejected = (array)WC()->session->get('whiz_dr_rejected_gifts', []);
            if (empty($rejected)) {
                return false;
            }
            $sig = $pid . '|' . $vid . '|' . md5(json_encode($var));
            return isset($rejected[$sig]);
        }

        /** בדיקה האם יש וריאציה כלשהי של המוצר שנדחתה (עבור BXGY) */
        protected static function is_product_rejected_any_variation($pid): bool
        {
            if (!function_exists('WC') || !WC()->session) {
                return false;
            }

            $pid = (int)$pid;
            if ($pid <= 0) return false;

            // אם ה-ID הוא וריאציה, נרצה לבדוק לפי ה-Parents
            // (כי ב-Cart Item ה-product_id הוא ה-Parent)
            if (function_exists('wc_get_product')) {
                $product = wc_get_product($pid);
                if ($product && $product->is_type('variation')) {
                    $pid = $product->get_parent_id();
                }
            }

            $rejected = (array)WC()->session->get('whiz_dr_rejected_gifts', []);
            if (empty($rejected)) {
                return false;
            }
            $prefix = $pid . '|';
            foreach ($rejected as $sig => $ts) {
                if (strpos($sig, $prefix) === 0) {
                    return true;
                }
            }
            return false;
        }

        // הזדמנויות למתנות שהמשתמש דחה (כדי להציג לו אופציה להחזיר)
        protected static $rejected_opportunities = [];

        public static function get_rejected_opportunities(): array
        {
            return self::$rejected_opportunities;
        }

        public static function unreject_gift($sig)
        {
            if (!function_exists('WC') || !WC()->session) return;
            $rejected = (array)WC()->session->get('whiz_dr_rejected_gifts', []);

            // ננסה לחלץ PID מהחתימה כדי לנקות את כל הוריאציות של המוצר הזה
            // החתימה היא PID|VID|MD5
            $parts = explode('|', $sig);
            if (count($parts) >= 1) {
                $target_pid = (int)$parts[0];

                // תוספת קריטית: אם ה-ID הוא וריאציה, המפתח ב-Session יהיה שמור תחת ה-Parent
                // לכן אני חייב למצוא את ה-Parent ולנקות לפי זה
                if (function_exists('wc_get_product')) {
                    $p = wc_get_product($target_pid);
                    if ($p && $p->is_type('variation')) {
                        $target_pid = $p->get_parent_id();
                    }
                }

                foreach (array_keys($rejected) as $k) {
                    // בדיקה אם המפתח מתחיל ב-PID הזה
                    if (strpos($k, $target_pid . '|') === 0) {
                        unset($rejected[$k]);
                    }
                }
            }

            // ליתר ביטחון, אם החתימה לא פורמלה כראוי או משהו אחר
            if (isset($rejected[$sig])) {
                unset($rejected[$sig]);
            }

            WC()->session->set('whiz_dr_rejected_gifts', $rejected);
            // שמירה מיידית כי ייתכן שמתבצע רידיירקט מיד אחרי זה
            if (method_exists(WC()->session, 'save_data')) {
                WC()->session->save_data();
            }
        }




        // צבירת חוקים שיושמו בסשן הריצה הנוכחי + דה-דופ
        public static $applied_rules = [];
        protected static $applied_rules_sigs = [];

        /** מיזוג להחלפה (ולא חיבור) – לשימוש בעדכון ה-Session */
        protected static function replace_extra(array $a, array $b): array
        {
            foreach ($b as $k => $v) {
                // תמיד מחליף – לא מחבר
                $a[$k] = $v;
            }
            return $a;
        }

        /** יחידת תצוגה תקנית לפי הגדרות WooCommerce (מספר ספרות אחרי נקודה וכו') */
        protected static function money_display(float $v): float
        {
            $dec = (int) wc_get_price_decimals();
            return round($v, $dec);
        }

        /** מחיר תצוגה לפריט לפי הגדרות WooCommerce (כולל מס/ללא מס בהתאם) */
        protected static function display_price_for_product($product, float $base_price): float
        {
            if (function_exists('wc_get_price_to_display') && $product) {
                return (float) wc_get_price_to_display($product, ['price' => $base_price]);
            }
            return (float) $base_price;
        }

        // חתימה אחידה לדופליקציה: לפי id,type,name,bucket בלבד
        protected static function rule_sig_from($id, $type, $name, $extra): string
        {
            $bucket = is_array($extra) ? ($extra['bucket'] ?? '') : '';
            return md5(wp_json_encode([(int) $id, (string) $type, (string) $name, (string) $bucket]));
        }
        protected static function rule_sig(array $rec): string
        {
            return self::rule_sig_from($rec['id'] ?? 0, $rec['type'] ?? '', $rec['name'] ?? '', $rec['extra'] ?? []);
        }

        /** איפוס הצבירה בתחילת סבב חישוב */
        public static function reset_applied_rules(): void
        {
            self::$applied_rules = [];
            self::$applied_rules_sigs = [];
            self::$rejected_opportunities = [];
        }

        /** סימון חוק שהוחל (עם דה-דופ), כולל צבירת extra כמו saved */
        protected static function note_rule_applied(array $rule, array $extra = []): void
        {
            $rec = [
                'id' => isset($rule['id']) ? (int) $rule['id'] : 0,
                'name' => isset($rule['name']) ? (string) $rule['name'] : '',
                'type' => isset($rule['type']) ? (string) $rule['type'] : '',
                'extra' => $extra,
                'ts' => time(),
            ];
            $sig = self::rule_sig($rec);

            // כבר קיים בזיכרון – מזג extra (וסמן זמן אחרון)
            if (isset(self::$applied_rules_sigs[$sig])) {
                for ($i = count(self::$applied_rules) - 1; $i >= 0; $i--) {
                    if (self::rule_sig(self::$applied_rules[$i]) === $sig) {
                        self::$applied_rules[$i]['extra'] = self::replace_extra(
                            (array) (self::$applied_rules[$i]['extra'] ?? []),
                            $extra
                        );
                        self::$applied_rules[$i]['ts'] = max(
                            (int) (self::$applied_rules[$i]['ts'] ?? 0),
                            (int) $rec['ts']
                        );
                        break;
                    }
                }
                // חשוב: מזג גם ב־Session במקום להוסיף כפילויות
                if (function_exists('WC') && WC()->session) {
                    $all = (array) WC()->session->get('whiz_applied_rules', []);
                    for ($i = count($all) - 1; $i >= 0; $i--) {
                        if (self::rule_sig((array) $all[$i]) === $sig) {
                            $all[$i]['extra'] = self::replace_extra((array) ($all[$i]['extra'] ?? []), $extra);
                            $all[$i]['ts'] = max((int) ($all[$i]['ts'] ?? 0), (int) $rec['ts']);
                            WC()->session->set('whiz_applied_rules', $all);
                            return;
                        }
                    }
                    // לא נמצא – הוסף (edge case)
                    $all[] = $rec;
                    WC()->session->set('whiz_applied_rules', $all);
                }
                return;
            }

            // רשומה חדשה
            self::$applied_rules_sigs[$sig] = 1;
            self::$applied_rules[] = $rec;

            if (function_exists('WC') && WC()->session) {
                $all = (array) WC()->session->get('whiz_applied_rules', []);
                $all[] = $rec; // חדש – מותר להוסיף
                WC()->session->set('whiz_applied_rules', $all);
            }
        }


        /** קריאה החוצה (עם מיזוג נתוני סשן) */
        public static function get_applied_rules(bool $merge_session = true): array
        {
            $rules = is_array(self::$applied_rules) ? self::$applied_rules : [];
            if ($merge_session && function_exists('WC') && WC()->session) {
                $from_session = (array) WC()->session->get('whiz_applied_rules', []);
                if ($from_session) {
                    $rules = array_merge($rules, $from_session);
                }
            }

            // איחוד לפי חתימה + בחירה לפי ts (לא חיבור!)
            $fold = [];
            foreach ($rules as $rec) {
                $rec = (array) $rec;
                $sig = self::rule_sig($rec);
                $extra = (array) ($rec['extra'] ?? []);
                $ts = (int) ($rec['ts'] ?? 0);

                if (!isset($fold[$sig])) {
                    $fold[$sig] = $rec;
                    $fold[$sig]['extra'] = $extra;
                } else {
                    // קח את החדש יותר – והחלף את extra במקום לצבור
                    $prev_ts = (int) ($fold[$sig]['ts'] ?? 0);
                    if ($ts >= $prev_ts) {
                        $fold[$sig]['extra'] = self::replace_extra((array) ($fold[$sig]['extra'] ?? []), $extra);
                        $fold[$sig]['ts'] = $ts;
                    }
                }
            }
            return array_values($fold);
        }

        protected static function aggregate_coupon_label(): string
        {
            if (empty(self::$as_coupon_labels)) {
                return __('Discount', 'whizmanage'); // Default label
            }

            $labels = array_keys(self::$as_coupon_labels);
            if (count($labels) === 1) {
                return $labels[0];
            }

            return implode(', ', $labels);
        }

        /** בדיקה גלובלית: האם יש בעגלה לפחות פריט אחד שעובר את ה-Filters */
        protected static function cart_has_any_matching_filters($cart, array $filters): bool
        {
            if (empty($filters))
                return true; // ללא פילטרים – מותר
            if (empty($cart) || !method_exists($cart, 'get_cart'))
                return false;
            foreach ($cart->get_cart() as $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;
                if (self::match_item_filters($filters, (array) $ci))
                    return true;
            }
            return false;
        }

        // בתוך class Whiz_Discount_Manager
        public static function apply_item_discounts($cart)
        {
            if (is_admin() && !defined('DOING_AJAX'))
                return;
            if (empty($cart) || !method_exists($cart, 'get_cart'))
                return;

            self::reset_applied_rules();
            self::maybe_reset_offer_state_by_cart($cart);

            if (!self::cart_has_real_items($cart)) {
                self::clear_offer();
            }

            // החזרת מחירי בסיס לפריטים שאינם "מתנות"
            foreach ($cart->get_cart() as $cart_item_key => $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;
                $p = $ci['data'] ?? null;
                if (!$p || !method_exists($p, 'get_price'))
                    continue;

                if (isset($cart->cart_contents[$cart_item_key]['whiz_dr_label'])) {
                    unset($cart->cart_contents[$cart_item_key]['whiz_dr_label']);
                }

                if (!isset($ci['whiz_dr_base_price'])) {
                    $base = $p->get_sale_price();
                    if ($base === '' || $base === null)
                        $base = $p->get_regular_price();
                    if ($base === '' || $base === null)
                        $base = $p->get_price();
                    $cart->cart_contents[$cart_item_key]['whiz_dr_base_price'] = wc_format_decimal((float) $base);
                }
                $p->set_price($cart->cart_contents[$cart_item_key]['whiz_dr_base_price']);
            }

            // מחירי מתנות לפי pct
            foreach ($cart->get_cart() as $cart_item_key => $ci) {
                if (empty($ci['whiz_dr_gift']))
                    continue;

                $pct = isset($ci['whiz_dr_pct']) ? (float) $ci['whiz_dr_pct'] : 100.0;
                $p = $ci['data'] ?? null;
                if (!$p || !method_exists($p, 'get_price'))
                    continue;

                $base = $p->get_sale_price();
                if ($base === '' || $base === null)
                    $base = $p->get_regular_price();
                if ($base === '' || $base === null)
                    $base = $p->get_price();

                $base = (float) $base;
                $new = $base * (1 - max(0, min(100, $pct)) / 100);
                $p->set_price(wc_format_decimal($new));
            }

            global $wpdb;
            $now = Whizmanage_Discount_Functions::get_current_time();
            $table = Whizmanage_Discount_Functions::get_table_name();
            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$table}
         WHERE status = 'publish'
           AND (start_date IS NULL OR start_date <= %s)
           AND (end_date   IS NULL OR end_date   >= %s)
         ORDER BY priority ASC, id DESC",
                $now,
                $now
            ), ARRAY_A);

            if (empty($rows))
                return;

            foreach ($rows as $rule) {
                $type = $rule['type'] ?? '';
                $actions = Whizmanage_Discount_Functions::json_decode($rule['actions']);
                $cond = Whizmanage_Discount_Functions::json_decode($rule['conditions']);
                $filters = Whizmanage_Discount_Functions::json_decode($rule['filters'] ?? []);

                // ⬅️ כלל ברזל: אם יש filters ולא קיים בעגלה אפילו פריט אחד שעובר אותם – דלג על החוק
                if (!self::cart_has_any_matching_filters($cart, (array) $filters)) {
                    continue;
                }

                if ($type === 'cart_adjustment')
                    continue;
                if (!self::rules_pass($cond, $cart))
                    continue;

                if ($type === 'bogo_discount') {
                    self::sync_bogo_gifts($cart, $cond, $actions, (array) $filters, $rule['message'] ?? '');
                    self::note_rule_applied($rule, [
                        'bucket' => 'bogo',
                        'descriptor' => self::build_min_descriptor('bogo', $actions),
                    ]);
                    continue;
                }

                if ($type === 'bxgy_discount') {
                    self::sync_bxgy_gifts($cart, $cond, $actions, (array) $filters, $rule['message'] ?? '');
                    self::note_rule_applied($rule, [
                        'bucket' => 'bxgy',
                        'descriptor' => self::build_min_descriptor('bxgy', $actions),
                    ]);
                    continue;
                }

                if ($type === 'bulk_discount' && !empty($actions['tiers']) && is_array($actions['tiers'])) {
                    $asCoupon = self::should_apply_as_coupon($actions);
                    if ($asCoupon) {
                        $clabel = isset($actions['coupon_label']) ? (string) $actions['coupon_label'] : '';
                        $saved = self::apply_bulk_tiers_as_coupon($cart, $cond, $actions['tiers'], $clabel, (array) $filters); // העברת filters
                        if ($saved > 0) {
                            $before = WC()->session ? (float) WC()->session->get('whiz_bulk_last_before', 0) : 0;
                            $after = WC()->session ? (float) WC()->session->get('whiz_bulk_last_after', 0) : 0;
                            $tier = WC()->session ? (array) WC()->session->get('whiz_bulk_last_tier', []) : [];
                            self::note_rule_applied($rule, [
                                'bucket' => 'bulk_coupon',
                                'saved' => round($saved, 2),
                                'affected_before' => round($before, 2),
                                'affected_after' => round($after, 2),
                                'before' => round($before, 2),
                                'after' => round($after, 2),
                                'descriptor' => self::build_min_descriptor('bulk_discount', $actions, ['picked_tier' => $tier]),
                            ]);
                        }
                    } else {
                        $saved = self::apply_bulk_tiers_to_cart($cart, $cond, $actions['tiers'], (array) $filters); // העברת filters
                        if ($saved > 0) {
                            $before = WC()->session ? (float) WC()->session->get('whiz_bulk_last_before', 0) : 0;
                            $after = WC()->session ? (float) WC()->session->get('whiz_bulk_last_after', 0) : 0;
                            $tier = WC()->session ? (array) WC()->session->get('whiz_bulk_last_tier', []) : [];
                            self::note_rule_applied($rule, [
                                'bucket' => 'bulk_price',
                                'saved' => round($saved, 2),
                                'affected_before' => round($before, 2),
                                'affected_after' => round($after, 2),
                                'before' => round($before, 2),
                                'after' => round($after, 2),
                                'descriptor' => self::build_min_descriptor('bulk_discount', $actions, ['picked_tier' => $tier]),
                            ]);
                        }
                    }
                    continue;
                }

                if ($type === 'product_adjustment') {
                    $__applied_any = false;
                    $__saved_total = 0.0;
                    $__affected_before = 0.0;
                    $__affected_after = 0.0;

                    $include_products = array_map('intval', (array) ($cond['product_ids'] ?? []));
                    $include_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['product_cat_ids'] ?? [])));
                    $include_tags = array_map('intval', (array) ($cond['product_tag_ids'] ?? []));
                    $exclude_tags = array_map('intval', (array) ($cond['exclude_product_tag_ids'] ?? []));
                    $include_skus = array_map('strtolower', array_map('strval', (array) ($cond['product_skus'] ?? [])));
                    $exclude_skus = array_map('strtolower', array_map('strval', (array) ($cond['exclude_product_skus'] ?? [])));
                    $attr_includes = is_array($cond['attribute_terms'] ?? null) ? $cond['attribute_terms'] : [];
                    $exclude_products = array_map('intval', (array) ($cond['exclude_product_ids'] ?? []));
                    $exclude_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['exclude_product_cat_ids'] ?? [])));
                    $attr_excludes = is_array($cond['exclude_attribute_terms'] ?? null) ? $cond['exclude_attribute_terms'] : [];
                    $require_on_sale = !empty($cond['require_on_sale']);
                    $exclude_on_sale = !empty($cond['exclude_on_sale']);
                    $asCoupon = self::should_apply_as_coupon($actions);

                    foreach ($cart->get_cart() as $cart_item_key => $item) {
                        if (!empty($item['whiz_dr_gift']))
                            continue;

                        // ← פילטרים של החוק (include/exclude)
                        if (!self::match_item_filters((array) $filters, (array) $item)) {
                            continue;
                        }

                        $pid = (int) ($item['product_id'] ?? 0);
                        if ($pid <= 0)
                            continue;

                        // Excludes
                        if (!empty($exclude_products) && in_array($pid, $exclude_products, true))
                            continue;

                        if (!empty($exclude_cats)) {
                            $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                            if (array_intersect($exclude_cats, $p_cats))
                                continue;
                        }

                        $productObj = $item['data'] ?? null;

                        if (!empty($exclude_skus)) {
                            $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                            if ($sku !== '' && in_array($sku, $exclude_skus, true))
                                continue;
                        }
                        if (!empty($attr_excludes) && Whizmanage_Discount_Functions::item_matches_any_attribute_pair($item, $attr_excludes))
                            continue;

                        // Targets (include*) – אם הוגדרו
                        $in_targets = true;
                        if (!empty($include_products) || !empty($include_cats) || !empty($include_tags) || !empty($attr_includes) || !empty($include_skus)) {
                            $in_targets = false;
                            if (!empty($include_products) && in_array($pid, $include_products, true))
                                $in_targets = true;

                            if (!$in_targets && !empty($include_cats)) {
                                $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                                $in_targets = (bool) array_intersect($include_cats, $p_cats);
                            }
                            if (!$in_targets && !empty($include_tags)) {
                                $p_tags = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_tag'));
                                $in_targets = (bool) array_intersect($include_tags, $p_tags);
                            }
                            if (!$in_targets && !empty($attr_includes)) {
                                $in_targets = Whizmanage_Discount_Functions::item_matches_any_attribute_pair($item, $attr_includes);
                            }
                            if (!$in_targets && !empty($include_skus)) {
                                $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                                if ($sku !== '' && in_array($sku, $include_skus, true))
                                    $in_targets = true;
                            }
                            if (!$in_targets)
                                continue;
                        }

                        if (!empty($exclude_tags)) {
                            $p_tags = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_tag'));
                            if (array_intersect($exclude_tags, $p_tags))
                                continue;
                        }

                        if ($exclude_on_sale && $productObj && $productObj->is_on_sale())
                            continue;
                        if ($require_on_sale && !($productObj && $productObj->is_on_sale()))
                            continue;

                        if (!$in_targets)
                            continue;

                        $product = $item['data'];
                        if (!$product || !method_exists($product, 'get_price'))
                            continue;

                        $base_raw = isset($item['whiz_dr_base_price']) ? (float) $item['whiz_dr_base_price'] : (float) $product->get_price();
                        $base = self::display_price_for_product($product, $base_raw);

                        $new_raw = self::apply_action_to_price('product_adjustment', $actions, $base_raw, $item);
                        $new = self::display_price_for_product($product, (float) $new_raw);

                        $qty = (int) ($item['quantity'] ?? 1);

                        if ($asCoupon) {
                            $diff = max(0.0, $base - $new) * max(1, $qty);
                            if ($diff > 0) {
                                $__applied_any = true;
                                $__saved_total += $diff;
                                $__affected_before += $base * $qty;
                                $__affected_after += $new * $qty;
                            }
                            $clabel = isset($actions['coupon_label']) ? (string) $actions['coupon_label'] : '';
                            self::add_coupon_discount($diff, $clabel);
                        } else {
                            if ($new !== $base) {
                                $product->set_price(wc_format_decimal($new));
                                $__applied_any = true;
                            }
                            $__saved_total += max(0.0, $base - $new) * max(1, $qty);
                            $__affected_before += $base * $qty;
                            $__affected_after += $new * $qty;
                        }

                        if (!empty($actions['label'])) {
                            $cart->cart_contents[$cart_item_key]['whiz_dr_label'] = (string) $actions['label'];
                        } else {
                            unset($cart->cart_contents[$cart_item_key]['whiz_dr_label']);
                        }
                    }

                    if ($__applied_any) {
                        self::note_rule_applied($rule, [
                            'bucket' => 'product_adjustment',
                            'saved' => self::money_display($__saved_total),
                            'affected_before' => self::money_display($__affected_before),
                            'affected_after' => self::money_display($__affected_after),
                            'before' => self::money_display($__affected_before),
                            'after' => self::money_display($__affected_after),
                            'descriptor' => self::build_min_descriptor('product_adjustment', $actions),
                        ]);
                    }
                    continue;
                }

                if ($type === 'spend_bundle') {
                    $saved = self::apply_spend_bundle_to_items($cart, $cond, $actions, (array) $filters); // העברת filters
                    if ($saved > 0) {
                        self::note_rule_applied($rule, [
                            'bucket' => 'spend_bundle',
                            'saved' => round($saved, 2),
                            'descriptor' => self::build_min_descriptor('spend_bundle', $actions),
                        ]);
                    } else {
                        self::note_rule_applied($rule, [
                            'bucket' => 'spend_bundle',
                            'descriptor' => self::build_min_descriptor('spend_bundle', $actions),
                        ]);
                    }
                    continue;
                }
            }

            // איחוד “קופון” לפריטי product/bulk במצב as coupon
            if (self::$as_coupon_total > 0) {
                $label = self::aggregate_coupon_label();
                $cart->add_fee($label, -1 * self::$as_coupon_total, false);
                self::$as_coupon_total = 0.0;
                self::$as_coupon_labels = [];
            }
        }

        /** bulk_discount במצב "קופון": כעת מכבד filters בכל הסכימות */
        protected static function apply_bulk_tiers_as_coupon($cart, array $cond, array $tiers, string $coupon_label = '', array $filters = []): float
        {
            $total_qty = 0;
            foreach ($cart->get_cart() as $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;
                if (!self::match_item_filters($filters, (array) $ci))
                    continue;
                if (self::match_item_conditions($cond, $cart, $ci)) {
                    $total_qty += (int) ($ci['quantity'] ?? 0);
                }
            }
            if ($total_qty <= 0)
                return 0.0;

            $tier = self::pick_tier_compat($tiers, $total_qty);
            if (!$tier)
                return 0.0;

            if (function_exists('WC') && WC()->session) {
                WC()->session->set('whiz_bulk_last_tier', $tier);
            }

            $saved_total = 0.0;
            $affected_before = 0.0;
            $affected_after = 0.0;

            foreach ($cart->get_cart() as $cart_item_key => $item) {
                if (!empty($item['whiz_dr_gift']))
                    continue;
                if (!self::match_item_filters($filters, (array) $item))
                    continue;
                if (!self::match_item_conditions($cond, $cart, $item))
                    continue;

                $product = $item['data'];
                if (!$product || !method_exists($product, 'get_price'))
                    continue;

                // בסיס
                $base_raw = isset($item['whiz_dr_base_price']) ? (float) $item['whiz_dr_base_price'] : (float) $product->get_price();
                $base = self::display_price_for_product($product, $base_raw);

                // מחיר חדש תאורטי לפי הטיר
                if ($tier['method'] === 'percentage') {
                    $pct = max(0, min(100, (float) $tier['amount']));
                    $new = $base * (1 - $pct / 100);
                } else {
                    $fixed = max(0, (float) $tier['amount']);
                    $new = max(0, $base - $fixed);
                }

                $qty = (int) ($item['quantity'] ?? 1);
                $diff = max(0.0, $base - $new) * max(1, $qty);

                if ($diff > 0) {
                    $saved_total += $diff;
                    $affected_before += $base * $qty;
                    $affected_after += $new * $qty;
                    self::add_coupon_discount($diff, $coupon_label);
                }

                // תווית תצוגה
                if (!empty($tier['label'])) {
                    $cart->cart_contents[$cart_item_key]['whiz_dr_label'] = (string) $tier['label'];
                } else {
                    unset($cart->cart_contents[$cart_item_key]['whiz_dr_label']);
                }
            }

            if (function_exists('WC') && WC()->session) {
                WC()->session->set('whiz_bulk_last_before', self::money_display($affected_before));
                WC()->session->set('whiz_bulk_last_after', self::money_display($affected_after));
            }

            return self::money_display($saved_total);
        }


        // הנחת עגלה (fee שלילי)
        public static function apply_cart_discounts($cart)
        {
            if (is_admin() && !defined('DOING_AJAX'))
                return;
            if (empty($cart) || !method_exists($cart, 'get_cart'))
                return;

            global $wpdb;
            $now = Whizmanage_Discount_Functions::get_current_time();
            $table = Whizmanage_Discount_Functions::get_table_name();

            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$table}
         WHERE status = 'publish'
           AND (start_date IS NULL OR start_date <= %s)
           AND (end_date   IS NULL OR end_date   >= %s)
         ORDER BY priority ASC, id DESC",
                $now,
                $now
            ), ARRAY_A);

            if (!empty($rows)) {
                foreach ($rows as $rule) {
                    $type = $rule['type'] ?? '';

                    if (!in_array($type, ['cart_adjustment', 'spend_bundle'], true))
                        continue;

                    $actions = Whizmanage_Discount_Functions::json_decode($rule['actions']);
                    $cond = Whizmanage_Discount_Functions::json_decode($rule['conditions']);
                    $filters = Whizmanage_Discount_Functions::json_decode($rule['filters'] ?? []);

                    // ⬅️ כלל ברזל: אם יש filters ולא קיים בעגלה אפילו פריט אחד שעובר אותם – דלג
                    if (!self::cart_has_any_matching_filters($cart, (array) $filters)) {
                        continue;
                    }

                    if (!self::match_cart_conditions($cond, $cart))
                        continue;
                    if (!self::rules_pass($cond, $cart))
                        continue;

                    if ($type === 'cart_adjustment') {
                        $base_subtotal = 0.0;
                        if (function_exists('WC') && WC()->cart) {
                            $base_subtotal = (float) WC()->cart->get_cart_contents_total();
                        }
                        if ($base_subtotal <= 0 && method_exists($cart, 'get_subtotal')) {
                            $base_subtotal = (float) $cart->get_subtotal();
                        }

                        $method = $actions['method'] ?? 'percentage';
                        $value = (float) ($actions['value'] ?? 0);
                        $discount = 0.0;

                        if ($method === 'percentage') {
                            $discount = $base_subtotal * (max(0, min(100, $value)) / 100);
                        } elseif ($method === 'fixed') {
                            $discount = min(max(0, $value), $base_subtotal);
                        }

                        if ($discount > 0) {

                            if (!empty($actions['coupon_label'])) {
                                $label = (string) $actions['coupon_label'];
                            } else {
                                $label = sprintf(
                                    /* translators: %s: discount rule name or ID */
                                    __('Discount: %s', 'whizmanage'),
                                    $rule['name'] ?? ('#' . $rule['id'])
                                );
                            }

                            $taxable = false;
                            $cart->add_fee($label, -1 * $discount, $taxable);

                            $final = $base_subtotal - $discount;

                            self::note_rule_applied($rule, [
                                'bucket' => 'cart_adjustment',
                                'base_subtotal'  => self::money_display($base_subtotal),
                                'final_subtotal' => self::money_display($final),
                                'saved'          => self::money_display($discount),
                                'before'         => self::money_display($base_subtotal),
                                'after'          => self::money_display($final),
                                'descriptor'     => self::build_min_descriptor('cart_adjustment', $actions),
                            ]);

                            break; // כלל עגלה ראשון בלבד
                        }
                    }

                    if ($type === 'spend_bundle') {
                        // כבר מטופל ב-apply_spend_bundle_to_items (קורא מפה)
                        $saved = self::apply_spend_bundle_to_items($cart, $cond, $actions, (array) $filters);
                        if ($saved > 0) {
                            self::note_rule_applied($rule, [
                                'bucket' => 'spend_bundle',
                                'saved' => round($saved, 2),
                                'descriptor' => self::build_min_descriptor('spend_bundle', $actions),
                            ]);
                        }
                    }
                }
            }

            // Fee מאוחד עבור product_adjustment/bulk_discount במצב "קופון"
            if (self::$as_coupon_total > 0) {
                $label = self::aggregate_coupon_label();
                $cart->add_fee($label, -1 * self::$as_coupon_total, false);

                // אפס כדי להימנע מכפולים בסבב הבא
                self::$as_coupon_total = 0.0;
                self::$as_coupon_labels = [];
            }
        }


        protected static function apply_spend_bundle_to_items($cart, array $cond, array $actions, array $filters = []): float
        {
            $rows = [];
            $eligible_subtotal = 0.0;

            foreach ($cart->get_cart() as $key => $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;
                if (!self::match_item_filters($filters, (array) $ci))
                    continue;
                if (!self::match_item_conditions($cond, $cart, $ci))
                    continue;

                $p = $ci['data'] ?? null;
                if (!$p || !method_exists($p, 'get_price'))
                    continue;

                $qty = (int) ($ci['quantity'] ?? 0);
                if ($qty <= 0)
                    continue;

                $base_raw = isset($ci['whiz_dr_base_price']) ? (float) $ci['whiz_dr_base_price'] : (float) $p->get_price();
                $base = self::display_price_for_product($p, $base_raw);

                $row_sub = $base * $qty; // subtotal לפי תצוגה
                if ($row_sub <= 0)
                    continue;

                $rows[] = ['key' => $key, 'p' => $p, 'qty' => $qty, 'base' => $base, 'sub' => $row_sub];
                $eligible_subtotal += $row_sub;
            }

            if ($eligible_subtotal <= 0)
                return 0.0;

            $unit = max(0.01, (float) ($actions['unit_amount'] ?? 0));
            $m = in_array(($actions['method'] ?? 'fixed'), ['fixed', 'percentage'], true) ? $actions['method'] : 'fixed';
            $val = max(0.0, (float) ($actions['value'] ?? 0));
            $isRecursive = !empty($actions['recursive']);

            $bundles = (int) floor($eligible_subtotal / $unit);
            if ($bundles <= 0)
                return 0.0;

            if ($m === 'fixed') {
                if ($eligible_subtotal < $unit)
                    return 0.0;
                $discount = $isRecursive ? min($val * $bundles, $eligible_subtotal) : min($val, $eligible_subtotal);
            } else { // percentage
                if ($eligible_subtotal < $unit)
                    return 0.0;
                $unitDiscount = $unit * (min(100.0, $val) / 100.0);
                $discount = $isRecursive ? min($bundles * $unitDiscount, $eligible_subtotal) : min($unitDiscount, $eligible_subtotal);
            }

            $discount = min($discount, $eligible_subtotal);
            if ($discount <= 0)
                return 0.0;

            $asCoupon = self::should_apply_as_coupon($actions);
            if ($asCoupon) {
                $clabel = isset($actions['coupon_label']) ? (string) $actions['coupon_label'] : '';
                self::add_coupon_discount($discount, $clabel);
                return self::money_display($discount);
            }

            // פיזור פרופורציונלי לפי subtotal תצוגה
            $left = $discount;
            $lastIndex = count($rows) - 1;

            foreach ($rows as $i => $r) {
                $share = ($i === $lastIndex) ? $left : round($discount * ($r['sub'] / $eligible_subtotal), wc_get_price_decimals());
                $share = max(0.0, min($share, $left));
                $left -= $share;
                if ($share <= 0)
                    continue;

                $cut_per_unit = $share / max(1, $r['qty']);
                $new = max(0.0, $r['base'] - $cut_per_unit);

                $r['p']->set_price(wc_format_decimal($new));
            }

            return self::money_display($discount);
        }


        /* =========================
     * Cart item name customization for gifts
     * ========================= */

        public static function customize_cart_item_name($product_name, $cart_item, $cart_item_key)
        {

            if (!empty($cart_item['whiz_dr_gift'])) {
                $pct = isset($cart_item['whiz_dr_pct'])
                    ? floatval($cart_item['whiz_dr_pct'])
                    : 100.0;

                if ($pct >= 100) {
                    $gift_text = __('🎁 Free Gift', 'whizmanage');
                } else {
                    $gift_text = sprintf(
                        /* translators: %s: discount percentage */
                        __('🎉 %s%% Off', 'whizmanage'),
                        $pct
                    );
                }

                $product_name .=
                    ' <br><small style="color: #27ae60; font-weight: bold;" class="whiz-gift-label">' .
                    esc_html($gift_text) .
                    '</small>';
            }


            // תווית bulk (אם הטיר הנוכחי הגדיר label)
            if (!empty($cart_item['whiz_dr_label'])) {
                $lbl = wp_strip_all_tags((string) $cart_item['whiz_dr_label']);
                $product_name .= ' <br><small style="color:#1f7a8c;font-weight:600;" class="whiz-bulk-label">' . esc_html($lbl) . '</small>';
            }

            return $product_name;
        }

        /* =========================
     * Offer helpers (popup mode)
     * ========================= */

        protected static function should_apply_as_coupon($actions): bool
        {
            $ruleFlag = !empty($actions['apply_as_coupon']);
            $userFlag = (function_exists('WC') && WC()->session) ? (bool) WC()->session->get('whiz_dr_as_coupon', false) : false;
            return ($ruleFlag || $userFlag);
        }

        protected static function add_coupon_discount(float $amount, string $label = ''): void
        {
            if ($amount > 0) {
                self::$as_coupon_total += $amount;
                if ($label !== '') {
                    self::$as_coupon_labels[$label] = 1; // dedupe
                }
            }
        }

        protected static function cart_signature($cart): string
        {
            $rows = [];
            foreach ($cart->get_cart() as $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;
                $pid = (int) ($ci['product_id'] ?? 0);
                $vid = (int) ($ci['variation_id'] ?? 0);
                $var = is_array($ci['variation'] ?? null) ? $ci['variation'] : [];
                $qty = (int) ($ci['quantity'] ?? 0);
                $rows[] = $pid . '|' . $vid . '|' . md5(json_encode($var)) . '|' . $qty;
            }
            sort($rows);
            return md5(implode(';', $rows));
        }

        protected static function maybe_reset_offer_state_by_cart($cart): void
        {
            if (!function_exists('WC') || !WC()->session)
                return;

            // אם לוחצים "עדכן עגלה" – נרצה לאפשר שוב פופ־אפ גם בלי שינוי כמויות
            $did_update_cart = isset($_POST['update_cart']) || isset($_REQUEST['update_cart']);
            if ($did_update_cart) {
                WC()->session->set('whiz_dr_bxgy_state', []);          // איפוס "פעם כבר הוצג" ל-BXGY
                WC()->session->set('whiz_dr_offer_blocklist', []);     // איפוס חסימות הצעות
                self::clear_offer();
            }

            // ניהול חתימת עגלה (לשימושים אחרים—BOGO וכו')
            $sig = self::cart_signature($cart);
            $prev = WC()->session->get('whiz_dr_cart_sig', '');
            if ($sig !== $prev) {
                WC()->session->set('whiz_dr_cart_sig', $sig);
                self::clear_offer();
                WC()->session->set('whiz_dr_offer_blocklist', []);
                WC()->session->set('whiz_dr_bogo_prompted', []);
            }
        }

        protected static function cart_has_real_items($cart): bool
        {
            if (!$cart || !method_exists($cart, 'get_cart'))
                return false;
            foreach ($cart->get_cart() as $ci) {
                if (empty($ci['whiz_dr_gift'])) {
                    $qty = (int) ($ci['quantity'] ?? 0);
                    if ($qty > 0)
                        return true;
                }
            }
            return false;
        }

        public static function current_offer()
        {
            if (!function_exists('WC') || !WC()->session) {
                return null;
            }

            if (function_exists('wc_load_cart')) {
                wc_load_cart();
            }

            if (WC()->cart && method_exists(WC()->cart, 'get_cart') && !self::cart_has_real_items(WC()->cart)) {
                self::clear_offer();
                return null;
            }

            $offer = WC()->session->get('whiz_dr_offer', null);
            return $offer;
        }

        protected static function is_offer_blocked($hash): bool
        {
            if (!function_exists('WC') || !WC()->session)
                return false;
            $blocked = (array) WC()->session->get('whiz_dr_offer_blocklist', []);
            return isset($blocked[$hash]);
        }

        protected static function block_offer($hash): void
        {
            if (!function_exists('WC') || !WC()->session)
                return;
            $blocked = (array) WC()->session->get('whiz_dr_offer_blocklist', []);
            $blocked[$hash] = 1;
            WC()->session->set('whiz_dr_offer_blocklist', $blocked);
        }

        protected static function offer_hash($product_id, $qty, $pct, $origin, $variation_id, $variation): string
        {
            return md5(implode('|', [
                (int) $product_id,
                (int) $qty,
                (float) $pct,
                (string) $origin,
                (int) $variation_id,
                md5(json_encode((array) $variation)),
            ]));
        }

        public static function set_offer($product_id, $qty, $pct, $origin, $variation_id = 0, $variation = [], $meta = [])
        {
            if (!function_exists('WC') || !WC()->session)
                return;

            if (function_exists('wc_load_cart')) {
                wc_load_cart();
            }
            if (!WC()->cart || !self::cart_has_real_items(WC()->cart)) {
                return;
            }

            $hash = self::offer_hash($product_id, $qty, $pct, $origin, $variation_id, $variation);
            if (self::is_offer_blocked($hash))
                return;

            $existing = WC()->session->get('whiz_dr_offer', null);
            if ($existing) {
                $existing_hash = self::offer_hash(
                    $existing['product_id'] ?? 0,
                    $existing['quantity'] ?? 0,
                    $existing['discount_pct'] ?? 0,
                    $existing['origin'] ?? '',
                    $existing['variation_id'] ?? 0,
                    $existing['variation'] ?? []
                );
                if ($existing_hash === $hash)
                    return;
            }

            $title = get_the_title($product_id);
            if ($variation_id && function_exists('wc_get_formatted_variation')) {
                $product = wc_get_product($variation_id);
                if ($product && $product->is_type('variation')) {
                    $attrs = wc_get_formatted_variation($product, true, false, true);
                    if ($attrs)
                        $title .= ' – ' . wp_strip_all_tags($attrs);
                }
            }

            $message = '';
            if (!empty($meta['message'])) {
                $message = (string) $meta['message'];
            } else {
                $message = self::create_offer_message($title, $pct, $origin, $qty);
            }

            WC()->session->set('whiz_dr_offer', [
                'product_id' => (int) $product_id,
                'variation_id' => (int) $variation_id,
                'variation' => is_array($variation) ? $variation : [],
                'quantity' => (int) $qty,
                'discount_pct' => (float) $pct,
                'origin' => $origin,
                'hash' => $hash,
                'requiresPopup' => ($pct > 0 && $pct < 100) && (defined('WHIZ_DR_POPUP_MODE') ? WHIZ_DR_POPUP_MODE : true),
                'message' => $message,
                'meta' => is_array($meta) ? $meta : [],
            ]);
        }

        protected static function create_offer_message($title, $pct, $origin, $qty)
        {
            if ($pct >= 100) {
                if ($origin === 'bogo') {
                    return sprintf(
                        /* translators: %1$s: product title */
                        __('🎁 Great! Get "%1$s" absolutely FREE with your purchase!', 'whizmanage'),
                        $title
                    );
                } elseif ($origin === 'bxgy') {
                    return sprintf(
                        /* translators: %1$s: product title */
                        __('🎁 Amazing! Get "%1$s" as a FREE gift!', 'whizmanage'),
                        $title
                    );
                }

                return sprintf(
                    /* translators: %1$s: product title */
                    __('🎁 Get "%1$s" FREE!', 'whizmanage'),
                    $title
                );
            }

            if ($origin === 'bogo') {
                return sprintf(
                    /* translators: 1: product title, 2: discount percentage */
                    __('🎉 Special offer: Get "%1$s" with %2$s%% discount!', 'whizmanage'),
                    $title,
                    $pct
                );
            } elseif ($origin === 'bxgy') {
                return sprintf(
                    /* translators: 1: product title, 2: discount percentage */
                    __('🎉 Add "%1$s" to your cart with %2$s%% off!', 'whizmanage'),
                    $title,
                    $pct
                );
            }

            return sprintf(
                /* translators: 1: product title, 2: discount percentage */
                __('🎉 Get "%1$s" with %2$s%% discount!', 'whizmanage'),
                $title,
                $pct
            );
        }



        public static function clear_offer()
        {
            if (function_exists('WC') && WC()->session) {
                WC()->session->set('whiz_dr_offer', null);
            }
        }

        public static function accept_offer()
        {
            $offer = self::current_offer();
            if (!$offer) {
                return new WP_Error('no_offer', 'No offer available', ['status' => 409]);
            }

            if (function_exists('wc_load_cart')) {
                wc_load_cart();
            }
            if (!function_exists('WC') || !WC()->cart) {
                return new WP_Error('no_cart', 'Cart is not available', ['status' => 503]);
            }

            $pid = (int) ($offer['product_id'] ?? 0);
            $vid = (int) ($offer['variation_id'] ?? 0);
            $var = is_array($offer['variation'] ?? null) ? $offer['variation'] : [];
            $qty = max(1, (int) ($offer['quantity'] ?? 1));
            $pct = max(0, min(100, (float) ($offer['discount_pct'] ?? 0)));

            if ($pid <= 0) {
                return new WP_Error('bad_product', 'Invalid product id', ['status' => 400]);
            }

            $cart_item_key = WC()->cart->add_to_cart(
                $pid,
                $qty,
                $vid,
                $var,
                [
                    'whiz_dr_gift' => 1,
                    'whiz_dr_origin' => $offer['origin'],
                    'whiz_dr_pct' => $pct,
                ]
            );

            if (!$cart_item_key) {
                return new WP_Error('add_failed', __('Could not add the offer item to the cart.', 'whizmanage'), ['status' => 409]);
            }

            if (function_exists('WC') && WC()->session && method_exists(WC()->session, 'set_customer_session_cookie')) {
                WC()->session->set_customer_session_cookie(true);
            }

            self::clear_offer();
            WC()->cart->calculate_totals();

            return [
                'accepted' => true,
                'added' => true,
                'key' => $cart_item_key,
            ];
        }

        public static function decline_offer()
        {
            $offer = self::current_offer();

            if ($offer && ($offer['origin'] ?? '') === 'bxgy' && function_exists('WC') && WC()->session) {
                $state = (array) WC()->session->get('whiz_dr_bxgy_state', []);
                $rule_sig = $offer['meta']['rule_sig'] ?? null;
                if ($rule_sig) {
                    $s = isset($state[$rule_sig]) ? (array) $state[$rule_sig] : ['prompted' => 0, 'eligible' => 0];
                    $s['prompted'] = 1;
                    $s['eligible'] = 1;
                    $state[$rule_sig] = $s;
                    WC()->session->set('whiz_dr_bxgy_state', $state);
                }
            }

            if ($offer && !empty($offer['hash'])) {
                self::block_offer($offer['hash']);
            }
            self::clear_offer();
            return ['declined' => true];
        }

        /* =========================
     * Core evaluators
     * ========================= */

        protected static function rules_pass($cond, $cart): bool
        {
            $cond = is_array($cond) ? $cond : [];
            $logic = ($cond['logic'] ?? 'all') === 'any' ? 'any' : 'all';
            $rules = is_array($cond['rules'] ?? null) ? $cond['rules'] : [];
            if (empty($rules))
                return true;

            $cmp = function (float $lhs, string $op, float $rhs): bool {
                switch ($op) {
                    case 'gt':
                        return $lhs > $rhs;
                    case 'gte':
                        return $lhs >= $rhs;
                    case 'lt':
                        return $lhs < $rhs;
                    case 'lte':
                        return $lhs <= $rhs;
                    case 'eq':
                        return abs($lhs - $rhs) < 1e-9;
                    case 'neq':
                        return abs($lhs - $rhs) >= 1e-9;
                }
                return false;
            };

            $get_subset_metrics = function ($cart, string $scope, array $ids): array {
                $sum_ex = 0.0;
                $sum_in = 0.0;
                $qty_sum = 0;
                $items_count = 0;

                // כולל תתי־קטגוריות
                $idsX = $scope === 'categories' ? Whizmanage_Discount_Functions::expand_term_ids_with_children($ids) : $ids;

                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;

                    $pid = (int) ($ci['product_id'] ?? 0);
                    $qty = (int) ($ci['quantity'] ?? 0);
                    $p = $ci['data'] ?? null;
                    if ($pid <= 0 || $qty <= 0 || !$p)
                        continue;

                    $include = true;
                    if ($scope === 'products') {
                        $include = in_array($pid, $idsX, true);
                    } elseif ($scope === 'categories') {
                        $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                        $include = (bool) array_intersect($idsX, $p_cats);
                    }
                    if (!$include)
                        continue;

                    if (isset($ci['whiz_dr_base_price'])) {
                        $base = (float) $ci['whiz_dr_base_price'];
                    } else {
                        $base = $p->get_sale_price();
                        if ($base === '' || $base === null)
                            $base = $p->get_regular_price();
                        if ($base === '' || $base === null)
                            $base = $p->get_price();
                        $base = (float) $base;
                    }

                    $sum_ex += (float) wc_get_price_excluding_tax($p, ['qty' => $qty, 'price' => $base]);
                    $sum_in += (float) wc_get_price_including_tax($p, ['qty' => $qty, 'price' => $base]);
                    $qty_sum += $qty;
                    $items_count += 1;
                }
                return compact('sum_ex', 'sum_in', 'qty_sum', 'items_count');
            };

            $positives = [];
            foreach ($rules as $r) {
                $kind = sanitize_key($r['kind'] ?? 'subtotal'); // subtotal | item_count
                $scope = sanitize_key($r['scope'] ?? 'cart');     // cart | categories | products
                $ids = array_map('intval', (array) ($r['ids'] ?? []));
                $cmpOp = sanitize_key($r['compare'] ?? 'gte');
                $amount = (float) ($r['amount'] ?? 0);
                $taxMode = sanitize_key($r['tax'] ?? (wc_prices_include_tax() ? 'incl' : 'excl'));

                if (!in_array($kind, ['subtotal', 'item_count'], true))
                    continue;
                if (!in_array($scope, ['cart', 'categories', 'products'], true))
                    continue;

                $m = $get_subset_metrics($cart, $scope, $ids);
                if ($kind === 'subtotal') {
                    $lhs = ($taxMode === 'incl') ? $m['sum_in'] : $m['sum_ex'];
                } else {
                    $lhs = (float) $m['qty_sum'];
                }
                $positives[] = $cmp($lhs, $cmpOp, $amount);
            }

            if (empty($positives))
                return true;
            return ($logic === 'all') ? !in_array(false, $positives, true) : in_array(true, $positives, true);
        }

        // בתוך Whiz_Discount_Manager – החלף את match_item_conditions() (תיקן טעות כתיב ישנה !in_array)
        public static function match_item_conditions($cond, $cart, $item)
        {
            if (!empty($item['whiz_dr_gift']))
                return false;

            $cond = is_array($cond) ? $cond : [];
            $logic = ($cond['logic'] ?? 'all') === 'any' ? 'any' : 'all';

            $pid = (int) ($item['product_id'] ?? 0);

            $exclude_products = array_map('intval', (array) ($cond['exclude_product_ids'] ?? []));
            $exclude_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['exclude_product_cat_ids'] ?? [])));
            $exclude_roles = array_filter((array) ($cond['user_roles_exclude'] ?? []));
            $exclude_tags = array_map('intval', (array) ($cond['exclude_product_tag_ids'] ?? []));
            $include_tags = array_map('intval', (array) ($cond['product_tag_ids'] ?? []));
            $include_skus = array_map('strval', (array) ($cond['product_skus'] ?? []));
            $exclude_skus = array_map('strval', (array) ($cond['exclude_product_skus'] ?? []));
            $attr_includes = is_array($cond['attribute_terms'] ?? null) ? $cond['attribute_terms'] : [];
            $attr_excludes = is_array($cond['exclude_attribute_terms'] ?? null) ? $cond['exclude_attribute_terms'] : [];

            $require_on_sale = !empty($cond['require_on_sale']);
            $exclude_on_sale = !empty($cond['exclude_on_sale']);

            if ((!empty($cond['user_roles']) || !empty($exclude_roles)) && !is_user_logged_in())
                return false;

            // exclude by tags
            if (!empty($exclude_tags) && $pid > 0) {
                $p_tags = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_tag'));
                if (array_intersect($exclude_tags, $p_tags))
                    return false;
            }

            if (is_user_logged_in() && !empty($exclude_roles)) {
                $roles = (array) wp_get_current_user()->roles;
                if (array_intersect($roles, $exclude_roles))
                    return false;
            }

            if ($pid > 0) {
                if (!empty($exclude_products) && in_array($pid, $exclude_products, true))
                    return false;
                if (!empty($exclude_cats)) {
                    $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                    if (array_intersect($exclude_cats, $p_cats))
                        return false;
                }
            }

            $productObj = $item['data'] ?? null;

            // exclude by SKU
            if (!empty($exclude_skus)) {
                $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                if ($sku !== '' && in_array($sku, $exclude_skus, true))
                    return false;
            }

            // exclude by attributes
            if (!empty($attr_excludes) && Whizmanage_Discount_Functions::item_matches_any_attribute_pair($item, $attr_excludes))
                return false;

            // NEW: exclude items that are on sale
            if ($exclude_on_sale && $productObj && $productObj->is_on_sale())
                return false;

            $positives = [];

            // min_qty
            if (isset($cond['min_qty']) && (int) $cond['min_qty'] > 0) {
                $qty_total = 0;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $qty_total += (int) ($ci['quantity'] ?? 0);
                }
                $positives[] = $qty_total >= (int) $cond['min_qty'];
            }

            // roles include
            if (!empty($cond['user_roles'])) {
                $ok = false;
                if (is_user_logged_in()) {
                    $roles = (array) wp_get_current_user()->roles;
                    $ok = (bool) array_intersect($roles, (array) $cond['user_roles']);
                }
                $positives[] = $ok;
            }

            // include explicit targets
            $include_products = array_map('intval', (array) ($cond['product_ids'] ?? []));
            $include_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['product_cat_ids'] ?? [])));

            if (!empty($include_products) || !empty($include_cats) || !empty($include_tags) || !empty($attr_includes) || !empty($include_skus)) {
                $ok = false;
                if ($pid > 0) {
                    if (!empty($include_products) && in_array($pid, $include_products, true))
                        $ok = true;

                    if (!$ok && !empty($include_cats)) {
                        $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                        $ok = (bool) array_intersect($include_cats, $p_cats);
                    }

                    if (!$ok && !empty($include_tags)) {
                        $p_tags = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_tag'));
                        $ok = (bool) array_intersect($include_tags, $p_tags);
                    }

                    if (!$ok && !empty($include_skus)) {
                        $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                        if ($sku !== '' && in_array($sku, $include_skus, true)) {
                            $ok = true;
                        }
                    }
                }

                if (!$ok && !empty($attr_includes)) {
                    $ok = Whizmanage_Discount_Functions::item_matches_any_attribute_pair($item, $attr_includes);
                }

                $positives[] = $ok;
            }

            // NEW: require item to be on sale
            if ($require_on_sale) {
                $positives[] = (bool) ($productObj && $productObj->is_on_sale());
            }

            if (empty($positives))
                return true;
            return ($logic === 'all') ? !in_array(false, $positives, true) : in_array(true, $positives, true);
        }

        public static function match_item_filters(array $filters, array $item): bool
        {
            if (!empty($item['whiz_dr_gift']))
                return false;
            if (empty($filters))
                return true;

            $pid = (int) ($item['product_id'] ?? 0);
    $vid = (int) ($item['variation_id'] ?? 0);
    
    // המזהה לחיפוש (ווריאציה אם קיימת, אחרת מוצר אב)
    $target_id = ($vid > 0) ? $vid : $pid;

    if ($pid <= 0)
        return false;

    $productObj = $item['data'] ?? null;

            foreach ($filters as $f) {
                $field = isset($f['field']) ? sanitize_key($f['field']) : '';
                $op = (isset($f['op']) && in_array($f['op'], ['include', 'exclude', 'only'], true)) ? $f['op'] : 'include';
                $rawValues = (array) ($f['values'] ?? []);

                if ($field === '') {
                    continue;
                }

                // For fields that don't need values (like on_sale), we allow empty.
                // For others, if empty values, we skip this filter (don't block).
                if ($field !== 'on_sale' && empty($rawValues)) {
                    continue;
                }

                $passes = true;

                switch ($field) {
                    case 'categories': {
                    $values = array_map('intval', $rawValues);
                    // קטגוריות נבדקות בדר"כ ברמת האב, אבל נבדוק קודם את היעד
                    $pCats = array_map('intval', (array) wc_get_product_term_ids($target_id, 'product_cat'));
                    if (empty($pCats) && $vid > 0) {
                        $pCats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                    }
                    $vals = Whizmanage_Discount_Functions::expand_term_ids_with_children($values);
                    $has = (bool) array_intersect($vals, $pCats);
                    $passes = ($op === 'exclude') ? !$has : $has;
                    break;
                }

            case 'products': {
                    $values = array_map('intval', $rawValues);
                    // בדיקה האם המזהה הספציפי (Target) או האב (Parent) נמצאים ברשימה
                    $has = in_array($target_id, $values, true) || ($vid > 0 && in_array($pid, $values, true));
                    $passes = ($op === 'exclude') ? !$has : $has;
                    break;
                }

            case 'tags': {
                    $values = array_map('intval', $rawValues);
                    $pTags = array_map('intval', (array) wc_get_product_term_ids($target_id, 'product_tag'));
                    if (empty($pTags) && $vid > 0) {
                        $pTags = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_tag'));
                    }
                    $has = (bool) array_intersect($values, $pTags);
                    $passes = ($op === 'exclude') ? !$has : $has;
                    break;
                }
                    case 'skus': {
                            $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                            $needles = array_map('strtolower', array_map('strval', $rawValues));
                            $has = ($sku !== '' && in_array($sku, $needles, true));
                            $passes = ($op === 'exclude') ? !$has : $has;
                            break;
                        }

                    case 'attributes': {
                            $has = false;
                            foreach ($rawValues as $pair) {
                                if (!is_array($pair)) continue;
                                $tax = $pair['taxonomy'] ?? '';
                                $tid = (int) ($pair['term_id'] ?? 0);
                                if (!$tax || !$tid) continue;

                                if (Whizmanage_Discount_Functions::item_has_attribute_term($item, $tax, $tid)) {
                                    $has = true;
                                    break;
                                }
                            }
                            $passes = ($op === 'exclude') ? !$has : $has;
                            break;
                        }

                    case 'user_roles': {
                            $user = wp_get_current_user();
                            $uRoles = $user->exists() ? (array) $user->roles : [];
                            $values = array_map('strval', $rawValues);
                            $has = (bool) array_intersect($values, $uRoles);
                            $passes = ($op === 'exclude') ? !$has : $has;
                            break;
                        }

                    case 'on_sale': {
                            $has = $productObj ? $productObj->is_on_sale() : false;
                            $passes = ($op === 'exclude') ? !$has : $has;
                            break;
                        }

                    default:
                        // Unknown field? Default to true to not block the rule, 
                        // but we should probably log this.
                        $passes = true;
                }

                if (!$passes) {
                    return false;
                }
            }

            return true;
        }

        protected static function match_cart_conditions($cond, $cart)
        {
            $cond = is_array($cond) ? $cond : [];
            $logic = ($cond['logic'] ?? 'all') === 'any' ? 'any' : 'all';

            $exclude_products = array_map('intval', (array) ($cond['exclude_product_ids'] ?? []));
            $exclude_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['exclude_product_cat_ids'] ?? [])));
            $exclude_roles = array_filter((array) ($cond['user_roles_exclude'] ?? []));
            $exclude_tags = array_map('intval', (array) ($cond['exclude_product_tag_ids'] ?? []));
            $include_tags = array_map('intval', (array) ($cond['product_tag_ids'] ?? []));
            $include_skus = array_map('strval', (array) ($cond['product_skus'] ?? []));
            $exclude_skus = array_map('strval', (array) ($cond['exclude_product_skus'] ?? []));
            $attr_includes = is_array($cond['attribute_terms'] ?? null) ? $cond['attribute_terms'] : [];
            $attr_excludes = is_array($cond['exclude_attribute_terms'] ?? null) ? $cond['exclude_attribute_terms'] : [];

            $require_on_sale = !empty($cond['require_on_sale']);
            $exclude_on_sale = !empty($cond['exclude_on_sale']);

            if ((!empty($cond['user_roles']) || !empty($exclude_roles)) && !is_user_logged_in()) {
                return false;
            }
            if (is_user_logged_in() && !empty($exclude_roles)) {
                $roles = (array) wp_get_current_user()->roles;
                if (array_intersect($roles, $exclude_roles)) {
                    return false;
                }
            }

            foreach ($cart->get_cart() as $item) {
                if (!empty($item['whiz_dr_gift']))
                    continue;
                $pid = (int) ($item['product_id'] ?? 0);
                if ($pid <= 0)
                    continue;

                if (!empty($exclude_products) && in_array($pid, $exclude_products, true)) {
                    return false;
                }

                if (!empty($exclude_cats)) {
                    $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                    if (array_intersect($exclude_cats, $p_cats)) {
                        return false;
                    }
                }

                if (!empty($exclude_tags)) {
                    $p_tags = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_tag'));
                    if (array_intersect($exclude_tags, $p_tags)) {
                        return false;
                    }
                }

                if (!empty($attr_excludes) && Whizmanage_Discount_Functions::item_matches_any_attribute_pair($item, $attr_excludes)) {
                    return false;
                }

                if (!empty($exclude_skus)) {
                    $productObj = $item['data'] ?? null;
                    $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                    if ($sku !== '' && in_array($sku, $exclude_skus, true)) {
                        return false;
                    }
                }

                if ($exclude_on_sale) {
                    $productObj = $item['data'] ?? null;
                    if ($productObj && $productObj->is_on_sale()) {
                        return false;
                    }
                }
            }

            $positives = [];
            if (isset($cond['min_qty']) && (int) $cond['min_qty'] > 0) {
                $qty_total = 0;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $qty_total += (int) ($ci['quantity'] ?? 0);
                }
                $positives[] = $qty_total >= (int) $cond['min_qty'];
            }

            if (!empty($cond['user_roles'])) {
                $ok = false;
                if (is_user_logged_in()) {
                    $roles = (array) wp_get_current_user()->roles;
                    $ok = (bool) array_intersect($roles, (array) $cond['user_roles']);
                }
                $positives[] = $ok;
            }

            $include_products = array_map('intval', (array) ($cond['product_ids'] ?? []));
            if (!empty($include_products)) {
                $has = false;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $pid = (int) ($ci['product_id'] ?? 0);
                    if ($pid > 0 && in_array($pid, $include_products, true)) {
                        $has = true;
                        break;
                    }
                }
                $positives[] = $has;
            }

            $include_cats = Whizmanage_Discount_Functions::expand_term_ids_with_children(array_map('intval', (array) ($cond['product_cat_ids'] ?? [])));
            if (!empty($include_cats)) {
                $has = false;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $pid = (int) ($ci['product_id'] ?? 0);
                    if ($pid <= 0)
                        continue;
                    $p_cats = array_map('intval', (array) wc_get_product_term_ids($pid, 'product_cat'));
                    if (array_intersect($include_cats, $p_cats)) {
                        $has = true;
                        break;
                    }
                }
                $positives[] = $has;
            }

            if (!empty($include_tags)) {
                $has = false;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $pidX = (int) ($ci['product_id'] ?? 0);
                    if ($pidX <= 0)
                        continue;
                    $p_tags = array_map('intval', (array) wc_get_product_term_ids($pidX, 'product_tag'));
                    if (array_intersect($include_tags, $p_tags)) {
                        $has = true;
                        break;
                    }
                }
                $positives[] = $has;
            }

            if (!empty($attr_includes)) {
                $has = false;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    if (Whizmanage_Discount_Functions::item_matches_any_attribute_pair($ci, $attr_includes)) {
                        $has = true;
                        break;
                    }
                }
                $positives[] = $has;
            }

            if (!empty($include_skus)) {
                $hasSku = false;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $productObj = $ci['data'] ?? null;
                    $sku = $productObj ? strtolower((string) $productObj->get_sku()) : '';
                    if ($sku !== '' && in_array($sku, $include_skus, true)) {
                        $hasSku = true;
                        break;
                    }
                }
                $positives[] = $hasSku;
            }

            if ($require_on_sale) {
                $hasOnSale = false;
                foreach ($cart->get_cart() as $ci) {
                    if (!empty($ci['whiz_dr_gift']))
                        continue;
                    $po = $ci['data'] ?? null;
                    if ($po && $po->is_on_sale()) {
                        $hasOnSale = true;
                        break;
                    }
                }
                $positives[] = $hasOnSale;
            }

            if (empty($positives))
                return true;
            return ($logic === 'all')
                ? !in_array(false, $positives, true)
                : in_array(true, $positives, true);
        }

        /* =========================
     * Actions
     * ========================= */

        /**
         * BOGO – סנכרון מתנות על אותו מוצר
         * ⬅️ תוקן: נוספה תמיכה ב-$filters כדי לכבד include/exclude בכל חוק
         */
        protected static function sync_bogo_gifts($cart, array $cond, array $actions, array $filters = [], string $rule_message = ''): void
        {
            if (self::$syncing_bogo_gifts)
                return;
            self::$syncing_bogo_gifts = true;

            $x = max(1, (int) ($actions['x_qty'] ?? 0));
            $y = max(1, (int) ($actions['y_qty'] ?? 0));
            $pct = max(0, min(100, (float) ($actions['discount_pct'] ?? 0)));
            $targets = array_map('intval', (array) ($actions['target_product_ids'] ?? []));
            $isRecursive = !empty($actions['recursive']);

            $prompted = [];
            if (function_exists('WC') && WC()->session) {
                $prompted = (array) WC()->session->get('whiz_dr_bogo_prompted', []);
            }

            $eligible_by_sig = [];
            foreach ($cart->get_cart() as $key => $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;

                if (!self::match_item_filters((array) $filters, (array) $ci))
                    continue;

                if (!self::match_item_conditions($cond, $cart, $ci))
                    continue;

                $pid = (int) ($ci['product_id'] ?? 0);
                if ($pid <= 0)
                    continue;
                if (!empty($targets) && !in_array($pid, $targets, true))
                    continue;

                $vid = (int) ($ci['variation_id'] ?? 0);
                $var = is_array($ci['variation'] ?? null) ? $ci['variation'] : [];
                $qty = (int) ($ci['quantity'] ?? 0);
                if ($qty <= 0)
                    continue;

                $sig = $pid . '|' . $vid . '|' . md5(json_encode($var));
                if (!isset($eligible_by_sig[$sig])) {
                    $eligible_by_sig[$sig] = ['pid' => $pid, 'vid' => $vid, 'variation' => $var, 'eligible' => 0];
                }
                $eligible_by_sig[$sig]['eligible'] += $isRecursive
                    ? self::calc_bogo_free_qty($qty, $x, $y)
                    : (($qty >= $x) ? $y : 0);
            }

            $gifts_by_sig = [];
            foreach ($cart->get_cart() as $key => $ci) {
                if (empty($ci['whiz_dr_gift']))
                    continue;
                if (($ci['whiz_dr_origin'] ?? '') !== 'bogo')
                    continue;

                $pid = (int) ($ci['product_id'] ?? 0);
                $vid = (int) ($ci['variation_id'] ?? 0);
                $var = is_array($ci['variation'] ?? null) ? $ci['variation'] : [];

                $sig = $pid . '|' . $vid . '|' . md5(json_encode($var));
                if (!isset($gifts_by_sig[$sig])) {
                    $gifts_by_sig[$sig] = ['qty' => 0, 'keys' => []];
                }
                $gifts_by_sig[$sig]['qty'] += (int) ($ci['quantity'] ?? 0);
                $gifts_by_sig[$sig]['keys'][] = $key;
            }

            foreach ($gifts_by_sig as $sig => $info) {
                $eligible = $eligible_by_sig[$sig]['eligible'] ?? 0;
                if ($eligible <= 0) {
                    foreach ($info['keys'] as $k) {
                        $cart->remove_cart_item($k);
                    }
                    unset($gifts_by_sig[$sig]);
                    if (isset($prompted[$sig])) {
                        unset($prompted[$sig]);
                    }
                }
            }

            foreach ($eligible_by_sig as $sig => $row) {
                $want = (int) $row['eligible'];
                $have = isset($gifts_by_sig[$sig]) ? (int) $gifts_by_sig[$sig]['qty'] : 0;

                if ($have > $want) {
                    $toRemove = $have - $want;
                    foreach ($gifts_by_sig[$sig]['keys'] as $k) {
                        if ($toRemove <= 0)
                            break;
                        $ci = $cart->get_cart_item($k);
                        $q = (int) ($ci['quantity'] ?? 0);
                        if ($q <= $toRemove) {
                            $cart->remove_cart_item($k);
                            $toRemove -= $q;
                        } else {
                            $cart->set_quantity($k, $q - $toRemove, false);
                            $toRemove = 0;
                        }
                    }
                    $have = $want;
                }

                if ($have < $want) {
                    $delta = $want - $have;

                    // בדיקה אם המשתמש דחה את המתנה הזו בעבר
                    if (self::is_gift_rejected($row['pid'], $row['vid'], $row['variation'])) {
                        // שומרים הזדמנות (כדי לאפשר שחזור)
                        $sig = $row['pid'] . '|' . $row['vid'] . '|' . md5(json_encode($row['variation']));
                        self::$rejected_opportunities[$sig] = [
                            'pid' => $row['pid'],
                            'vid' => $row['vid'],
                            'variation' => $row['variation'],
                            'sig' => $sig
                        ];
                        continue; // דלג – אל תוסיף מחדש
                    }

                    if ($pct >= 100) {
                        $cart->add_to_cart(
                            $row['pid'],
                            $delta,
                            $row['vid'],
                            $row['variation'],
                            [
                                'whiz_dr_gift' => 1,
                                'whiz_dr_origin' => 'bogo',
                                'whiz_dr_pct' => $pct,
                            ]
                        );
                    } else {
                        if (empty($prompted[$sig])) {
                            $meta = [];
                            if ($rule_message !== '') {
                                $meta['message'] = (string) $rule_message; // ← שימוש בהודעת החוק
                            }
                            self::set_offer($row['pid'], $delta, $pct, 'bogo', $row['vid'], $row['variation'], $meta);
                            $prompted[$sig] = 1;
                        } else {
                            $cart->add_to_cart(
                                $row['pid'],
                                $delta,
                                $row['vid'],
                                $row['variation'],
                                [
                                    'whiz_dr_gift' => 1,
                                    'whiz_dr_origin' => 'bogo',
                                    'whiz_dr_pct' => $pct,
                                ]
                            );
                        }
                    }
                }
            }

            if (function_exists('WC') && WC()->session) {
                WC()->session->set('whiz_dr_bogo_prompted', $prompted);
            }

            self::$syncing_bogo_gifts = false;
        }

        /**
         * BXGY – סנכרון מתנות BUY X GET Y
         * ⬅️ תוקן: נוספה תמיכה ב-$filters (נאכף על **פריטי ה-BUY** בזמן חישוב זכאות)
         */
        protected static function sync_bxgy_gifts($cart, array $cond, array $actions, array $filters = [], string $rule_message = ''): void
        {
            if (self::$syncing_bogo_gifts)
                return;
            self::$syncing_bogo_gifts = true;

            $x = max(1, (int) ($actions['x_qty'] ?? 0));
            $y = max(1, (int) ($actions['y_qty'] ?? 0));
            $pct = max(0, (int) ($actions['discount_pct'] ?? 0));
            $isRecursive = !empty($actions['recursive']);

            $buy_ids = array_map('intval', (array) ($actions['buy_product_ids'] ?? []));
            $get_ids = array_map('intval', (array) ($actions['get_product_ids'] ?? []));
            $rule_sig = md5('bxgy|' . implode(',', $buy_ids) . '|' . implode(',', $get_ids) . "|$x|$y|$pct");

            if (empty($get_ids)) {
                self::$syncing_bogo_gifts = false;
                return;
            }

            $total_buy_qty = 0;
            foreach ($cart->get_cart() as $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;

                if (!self::match_item_filters((array) $filters, (array) $ci))
                    continue;

                if (!self::match_item_conditions($cond, $cart, $ci))
                    continue;

                $pid = (int) ($ci['product_id'] ?? 0);
                $vid = (int) ($ci['variation_id'] ?? 0);

                // בדיקה אם המוצר או הווריאציה שלו נמצאים ברשימת Buy
                $match = false;
                if (!empty($buy_ids)) {
                    if (in_array($pid, $buy_ids, true)) $match = true;
                    if ($vid && in_array($vid, $buy_ids, true)) $match = true;
                } else {
                    $match = true; // אם אין רשימה, מקבלים הכל
                }

                if (!empty($buy_ids) && !$match)
                    continue;

                $total_buy_qty += (int) ($ci['quantity'] ?? 0);
            }

            $eligible = $isRecursive
                ? (($total_buy_qty >= $x) ? (intdiv($total_buy_qty, $x) * $y) : 0)
                : (($total_buy_qty >= $x) ? $y : 0);

            $gifts_by_sig = [];
            foreach ($cart->get_cart() as $key => $ci) {
                if (empty($ci['whiz_dr_gift']) || ($ci['whiz_dr_origin'] ?? '') !== 'bxgy')
                    continue;
                $pid = (int) ($ci['product_id'] ?? 0);
                $vid = (int) ($ci['variation_id'] ?? 0);

                // בדיקה אם המתנה (המוצר או הווריאציה) נמצאת ברשימת Get
                $match = false;
                if (!empty($get_ids)) {
                    if (in_array($pid, $get_ids, true)) $match = true;
                    if ($vid && in_array($vid, $get_ids, true)) $match = true;
                }

                if (!empty($get_ids) && !$match)
                    continue;

                $var = is_array($ci['variation'] ?? null) ? $ci['variation'] : [];
                $sig = $pid . '|' . $vid . '|' . md5(json_encode($var));

                if (!isset($gifts_by_sig[$sig])) {
                    $gifts_by_sig[$sig] = ['qty' => 0, 'keys' => [], 'pid' => $pid, 'vid' => $vid, 'var' => $var];
                }
                $gifts_by_sig[$sig]['qty'] += (int) ($ci['quantity'] ?? 0);
                $gifts_by_sig[$sig]['keys'][] = $key;
            }

            if ($eligible <= 0) {
                foreach ($gifts_by_sig as $info) {
                    foreach ($info['keys'] as $k) {
                        $cart->remove_cart_item($k);
                    }
                }
                if (function_exists('WC') && WC()->session) {
                    $state = (array) WC()->session->get('whiz_dr_bxgy_state', []);
                    unset($state[$rule_sig]);
                    WC()->session->set('whiz_dr_bxgy_state', $state);
                }
                self::$syncing_bogo_gifts = false;
                return;
            }

            $y_pid = (int) $get_ids[0];
            if ($y_pid <= 0) {
                self::$syncing_bogo_gifts = false;
                return;
            }

            $have = 0;
            $targets = [];
            foreach ($gifts_by_sig as $sig => $info) {
                // בדיקה אם המתנה הקיימת תואמת למוצר המבוקש (Parent או Variation)
                if ($info['pid'] === $y_pid || $info['vid'] === $y_pid) {
                    $have += (int) $info['qty'];
                    $targets[$sig] = $info;
                }
            }

            if ($have > $eligible) {
                $toRemove = $have - $eligible;
                foreach ($targets as $sig => $info) {
                    foreach ($info['keys'] as $k) {
                        if ($toRemove <= 0)
                            break 2;
                        $ci = $cart->get_cart_item($k);
                        $q = (int) ($ci['quantity'] ?? 0);
                        if ($q <= $toRemove) {
                            $cart->remove_cart_item($k);
                            $toRemove -= $q;
                        } else {
                            $cart->set_quantity($k, $q - $toRemove, false);
                            $toRemove = 0;
                        }
                    }
                }
                $have = $eligible;
            }

            if ($have < $eligible) {
                $delta = $eligible - $have;

                // בדיקה אם המשתמש דחה את המתנה (בודקים אם דחה *איזשהו* מופע של המוצר הזה)
                if (!self::is_product_rejected_any_variation($y_pid)) {
                    if ($pct >= 100.0 || !defined('WHIZ_DR_POPUP_MODE') || !WHIZ_DR_POPUP_MODE) {
                        $cart->add_to_cart(
                            $y_pid,
                            $delta,
                            0,
                            [],
                            [
                                'whiz_dr_gift' => 1,
                                'whiz_dr_origin' => 'bxgy',
                                'whiz_dr_pct' => $pct,
                            ]
                        );
                    } else {
                        $meta = ['rule_sig' => $rule_sig];
                        if ($rule_message !== '') {
                            $meta['message'] = (string) $rule_message; // ← שימוש בהודעת החוק
                        }

                        // בדיקה אם y_pid הוא ווריאציה
                        $y_vid = 0;
                        $y_var = [];
                        $product = wc_get_product($y_pid);
                        if ($product && $product->is_type('variation')) {
                            $y_vid = $y_pid;
                            $y_pid = $product->get_parent_id();
                            $y_var = $product->get_variation_attributes();
                        }

                        self::set_offer($y_pid, $delta, $pct, 'bxgy', $y_vid, $y_var, $meta);
                    }
                } else {
                    // שמור כהזדמנות (BXGY currently supports simple products mostly in this context, use generic sig)
                    $sig = $y_pid . '|0|' . md5(json_encode([]));
                    // אם רוצים להיות מדוייקים, אפשר לחפש איזו וריאציה בדיוק נדחתה, אבל לצורך השחזור Generic זה בסדר כי זה יפתח את האופציה מחדש
                    self::$rejected_opportunities[$sig] = [
                        'pid' => $y_pid,
                        'vid' => 0,
                        'variation' => [],
                        'sig' => $sig
                    ];
                }
            }

            if (function_exists('WC') && WC()->session) {
                $state = (array) WC()->session->get('whiz_dr_bxgy_state', []);
                if ($eligible > 0) {
                    $s = isset($state[$rule_sig]) ? (array) $state[$rule_sig] : ['prompted' => 0, 'eligible' => 0];
                    $s['eligible'] = 1;
                    $state[$rule_sig] = $s;
                }
                WC()->session->set('whiz_dr_bxgy_state', $state);
            }

            self::$syncing_bogo_gifts = false;
        }

        /**
         * Descriptor קצר וברור להצגה...
         */
        protected static function build_min_descriptor(string $type, array $actions = [], array $ctx = []): array
        {
            $type = sanitize_key($type);
            $out = [
                'type' => $type,
                'amount_kind' => null,
                'amount_value' => null,
                'qty' => null,
                'label' => '',
            ];

            $label = '';
            if (!empty($actions['label']))
                $label = (string) $actions['label'];
            if (!empty($actions['coupon_label']))
                $label = (string) $actions['coupon_label'];
            $out['label'] = $label;

            switch ($type) {
                case 'product_adjustment':
                case 'cart_adjustment':
                    $method = in_array(($actions['method'] ?? 'percentage'), ['percentage', 'fixed'], true) ? $actions['method'] : 'percentage';
                    $val = isset($actions['value']) ? (float) $actions['value'] : null;
                    $out['amount_kind'] = ($method === 'percentage') ? 'percent' : 'fixed';
                    $out['amount_value'] = $val;
                    break;

                case 'bulk_discount':
                    $out['amount_kind'] = 'bulk';
                    if (!empty($ctx['picked_tier']) && is_array($ctx['picked_tier'])) {
                        $t = $ctx['picked_tier'];
                        $out['amount_kind'] = ($t['method'] ?? 'percentage') === 'percentage' ? 'percent' : 'fixed';
                        $out['amount_value'] = isset($t['amount']) ? (float) $t['amount'] : null;
                        $out['qty'] = [
                            'tier_min' => (int) ($t['min'] ?? 0),
                            'tier_max' => isset($t['max']) && $t['max'] !== null && $t['max'] !== '' ? (int) $t['max'] : null,
                        ];
                    }
                    break;

                case 'bogo':
                case 'bxgy':
                    $pct = isset($actions['discount_pct']) ? (float) $actions['discount_pct'] : 100.0;
                    $out['amount_kind'] = 'percent';
                    $out['amount_value'] = $pct;
                    $out['qty'] = [
                        'buy' => max(1, (int) ($actions['x_qty'] ?? 0)),
                        'get' => max(1, (int) ($actions['y_qty'] ?? 0)),
                    ];
                    break;

                case 'shipping_discount':
                    $method = in_array(($actions['method'] ?? 'percentage'), ['percentage', 'fixed'], true) ? $actions['method'] : 'percentage';
                    $val = isset($actions['value']) ? (float) $actions['value'] : null;
                    $out['amount_kind'] = ($method === 'percentage') ? 'percent' : 'fixed';
                    $out['amount_value'] = $val;
                    break;

                case 'spend_bundle':
                    $m = in_array(($actions['method'] ?? 'fixed'), ['fixed', 'percentage'], true) ? $actions['method'] : 'fixed';
                    $val = isset($actions['value']) ? (float) $actions['value'] : null;
                    $out['amount_kind'] = ($m === 'percentage') ? 'percent' : 'fixed';
                    $out['amount_value'] = $val;
                    break;
            }

            return $out;
        }

        public static function shipping_rate_is_allowed($rate, array $allowed): bool
        {
            if (empty($allowed))
                return true;
            $method_id = method_exists($rate, 'get_method_id') ? (string) $rate->get_method_id() : '';
            $instance_id = method_exists($rate, 'get_instance_id') ? (string) $rate->get_instance_id() : '';
            $full = $method_id . ':' . $instance_id;
            return in_array($method_id, $allowed, true) || in_array($full, $allowed, true);
        }

        public static function filter_package_rates_shipping_discount($rates, $package)
        {
            if (is_admin() && !defined('DOING_AJAX'))
                return $rates;
            if (!function_exists('WC') || !WC()->cart)
                return $rates;

            global $wpdb;
            $now = Whizmanage_Discount_Functions::get_current_time();
            $table = Whizmanage_Discount_Functions::get_table_name();

            $rows = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM {$table}
         WHERE status = 'publish'
           AND type   = %s
           AND (start_date IS NULL OR start_date <= %s)
           AND (end_date   IS NULL OR end_date   >= %s)
         ORDER BY priority ASC, id DESC",
                'shipping_discount',
                $now,
                $now
            ), ARRAY_A);

            if (empty($rows)) {
                if (function_exists('WC') && WC()->session) {
                    WC()->session->__unset('whiz_shipping_discount_label');
                }
                return $rates;
            }

            foreach ($rows as $row) {
                $cond = Whizmanage_Discount_Functions::json_decode($row['conditions'] ?? []);
                $filters = Whizmanage_Discount_Functions::json_decode($row['filters'] ?? []);

                // ⬅️ כלל ברזל: אם יש filters ולא קיים בעגלה אפילו פריט אחד שעובר אותם – דלג
                if (!self::cart_has_any_matching_filters(WC()->cart, (array) $filters)) {
                    continue;
                }

                if (!self::match_cart_conditions($cond, WC()->cart))
                    continue;
                if (!self::rules_pass($cond, WC()->cart))
                    continue;

                $a = Whizmanage_Discount_Functions::json_decode($row['actions'] ?? []);
                $allowed = array_map('strval', (array) ($a['shipping_methods'] ?? []));
                $how = in_array(($a['method'] ?? 'percentage'), ['percentage', 'fixed'], true) ? $a['method'] : 'percentage';
                $val = (float) ($a['value'] ?? 0);
                $val = ($how === 'percentage') ? max(0, min(100, $val)) : max(0, $val);
                $label = isset($a['label']) ? (string) $a['label'] : '';

                $chosen_id = null;
                if (function_exists('WC') && WC()->session) {
                    $chosen = (array) WC()->session->get('chosen_shipping_methods', []);
                    if (!empty($chosen)) {
                        $chosen_id = reset($chosen);
                    }
                }

                $best = null;

                foreach ($rates as $rate_id => $rate) {
                    if (!self::shipping_rate_is_allowed($rate, $allowed))
                        continue;

                    $orig = method_exists($rate, 'get_cost') ? (float) $rate->get_cost() : 0.0;
                    if ($orig <= 0)
                        continue;

                    $new = ($how === 'percentage') ? $orig * (1 - $val / 100) : max(0.0, $orig - $val);

                    if (method_exists($rate, 'set_cost')) {
                        $rate->set_cost($new);
                    }
                    if (method_exists($rate, 'get_taxes') && method_exists($rate, 'set_taxes')) {
                        $taxes = (array) $rate->get_taxes();
                        $ratio = $orig > 0 ? ($new / $orig) : 0.0;
                        foreach ($taxes as $k => $v) {
                            $taxes[$k] = wc_format_decimal((float) $v * $ratio);
                        }
                        $rate->set_taxes($taxes);
                    }
                    if ($label && method_exists($rate, 'get_label') && method_exists($rate, 'set_label')) {
                        $rate->set_label(trim($rate->get_label() . ' – ' . $label));
                    }

                    $candidate = ['rate_id' => $rate_id, 'orig' => $orig, 'new' => $new];
                    if ($chosen_id && $rate_id === $chosen_id) {
                        $best = $candidate;
                    } elseif ($best === null || $candidate['new'] < $best['new']) {
                        $best = $candidate;
                    }
                }

                if ($best && $best['orig'] > $best['new']) {
                    $saved = round(max(0, $best['orig'] - $best['new']), 2);

                    if (function_exists('WC') && WC()->session) {
                        WC()->session->set('whiz_shipping_discount_label', $saved);
                    }

                    self::note_rule_applied($row, [
                        'bucket' => 'shipping_discount',
                        'original_shipping' => self::money_display($best['orig']),
                        'final_shipping' => self::money_display($best['new']),
                        'saved' => $saved,
                        'before' => self::money_display($best['orig']),
                        'after' => self::money_display($best['new']),
                        'descriptor' => self::build_min_descriptor('shipping_discount', $a),
                    ]);
                } else {
                    if (function_exists('WC') && WC()->session) {
                        WC()->session->__unset('whiz_shipping_discount_label');
                    }
                }

                break; // כלל משלוח ראשון שתפס
            }

            return $rates;
        }

        protected static function calc_bogo_free_qty(int $qty, int $x, int $y): int
        {
            if ($x <= 0 || $y <= 0)
                return 0;
            if ($qty < $x)
                return 0;
            return intdiv($qty, $x) * $y;
        }

        protected static function apply_bulk_tiers_to_cart($cart, array $cond, array $tiers, array $filters = []): float
        {
            $total_qty = 0;
            foreach ($cart->get_cart() as $ci) {
                if (!empty($ci['whiz_dr_gift']))
                    continue;
                if (!self::match_item_filters($filters, (array) $ci))
                    continue;
                if (self::match_item_conditions($cond, $cart, $ci)) {
                    $total_qty += (int) ($ci['quantity'] ?? 0);
                }
            }
            if ($total_qty <= 0)
                return 0.0;

            $tier = self::pick_tier_compat($tiers, $total_qty);
            if (!$tier)
                return 0.0;

            if (function_exists('WC') && WC()->session) {
                WC()->session->set('whiz_bulk_last_tier', $tier);
            }

            $saved_total = 0.0;
            $affected_before = 0.0;
            $affected_after = 0.0;

            foreach ($cart->get_cart() as $cart_item_key => $item) {
                if (!empty($item['whiz_dr_gift']))
                    continue;
                if (!self::match_item_filters($filters, (array) $item))
                    continue;
                if (!self::match_item_conditions($cond, $cart, $item))
                    continue;

                $product = $item['data'];
                if (!$product || !method_exists($product, 'get_price'))
                    continue;

                $base_raw = isset($item['whiz_dr_base_price']) ? (float) $item['whiz_dr_base_price'] : (float) $product->get_price();
                $base = self::display_price_for_product($product, $base_raw);

                if ($tier['method'] === 'percentage') {
                    $pct = max(0, min(100, (float) $tier['amount']));
                    $new = $base * (1 - $pct / 100);
                } else {
                    $fixed = max(0, (float) $tier['amount']);
                    $new = max(0, $base - $fixed);
                }

                $qty = (int) ($item['quantity'] ?? 1);
                $saved_total += max(0.0, $base - $new) * max(1, $qty);
                $affected_before += $base * $qty;
                $affected_after += $new * $qty;

                $product->set_price(wc_format_decimal($new));

                if (!empty($tier['label'])) {
                    $cart->cart_contents[$cart_item_key]['whiz_dr_label'] = (string) $tier['label'];
                } else {
                    unset($cart->cart_contents[$cart_item_key]['whiz_dr_label']);
                }
            }

            if (function_exists('WC') && WC()->session) {
                WC()->session->set('whiz_bulk_last_before', self::money_display($affected_before));
                WC()->session->set('whiz_bulk_last_after', self::money_display($affected_after));
            }
            return self::money_display($saved_total);
        }

        protected static function pick_tier_compat(array $tiers, int $qty): ?array
        {
            $normalized = [];
            foreach ($tiers as $t) {
                $min = isset($t['min']) ? (int) $t['min'] : 0;
                $maxRaw = array_key_exists('max', $t) ? $t['max'] : null;
                $max = ($maxRaw === '' || $maxRaw === null) ? null : (int) $maxRaw;

                if (isset($t['pct']) && is_numeric($t['pct'])) {
                    $method = 'percentage';
                    $amount = (float) $t['pct'];
                } else {
                    $method = in_array($t['method'] ?? '', ['percentage', 'fixed'], true) ? $t['method'] : 'percentage';
                    $amount = (float) ($t['amount'] ?? 0);
                }

                $label = isset($t['label']) && is_scalar($t['label']) ? (string) $t['label'] : '';

                if ($method === 'percentage') {
                    if ($amount < 0)
                        $amount = 0.0;
                    if ($amount > 100)
                        $amount = 100.0;
                } else {
                    if ($amount < 0)
                        $amount = 0.0;
                }

                $normalized[] = [
                    'min' => $min,
                    'max' => $max,
                    'method' => $method,
                    'amount' => $amount,
                    'label' => $label,
                ];
            }

            usort($normalized, function ($a, $b) {
                $ax = $a['max'] === null ? PHP_INT_MAX : $a['max'];
                $bx = $b['max'] === null ? PHP_INT_MAX : $b['max'];
                if ($a['min'] === $b['min']) {
                    return $ax <=> $bx;
                }
                return $a['min'] <=> $b['min'];
            });

            $picked = null;
            foreach ($normalized as $t) {
                $okMin = ($qty >= $t['min']);
                $okMax = ($t['max'] === null) ? true : ($qty <= $t['max']);
                if ($okMin && $okMax) {
                    $picked = $t;
                }
            }

            return $picked;
        }

        public static function apply_action_to_price($type, $actions, $base_price, $item)
        {
            $base_price = (float) $base_price;
            $a = is_array($actions) ? $actions : [];

            switch ($type) {
                case 'product_adjustment':
                    $method = $a['method'] ?? 'percentage';
                    $val = (float) ($a['value'] ?? 0);
                    if ($method === 'percentage') {
                        $pct = max(0, min(100, $val));
                        return $base_price * (1 - $pct / 100);
                    }
                    if ($method === 'fixed') {
                        return max(0, $base_price - max(0, $val));
                    }
                    break;

                case 'bulk_discount':
                    $tiers = is_array($a['tiers'] ?? null) ? $a['tiers'] : [];
                    $qty = (int) ($item['quantity'] ?? 1);
                    $best = 0;
                    foreach ($tiers as $t) {
                        $min = (int) ($t['min'] ?? 0);
                        $pc = (float) ($t['pct'] ?? 0);
                        if ($qty >= $min)
                            $best = max($best, $pc);
                    }
                    return $base_price * (1 - $best / 100);
            }

            return $base_price;
        }
    }
}
