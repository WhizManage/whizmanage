<?php
if (! defined('ABSPATH')) {
    exit;
}
if (!class_exists('WhizManage_Orders')) {

    class WhizManage_Orders
    {

    
        public function get_orders(array $args = []): array
        {
            $page = max(1, intval($args['page'] ?? 1));
            $per_page = intval($args['per_page'] ?? 20);
            $paginate = array_key_exists('paginate', $args) ? (bool) $args['paginate'] : ($per_page !== -1);
            $search = isset($args['search']) && strlen(trim((string) $args['search'])) ? trim((string) $args['search']) : null;

            $statuses = isset($args['status']) && is_array($args['status'])
                ? $args['status']
                : ['completed', 'processing', 'on-hold', 'pending', 'cancelled', 'refunded', 'failed'];

            $date_from = $args['date_from'] ?? null;
            $date_to = $args['date_to'] ?? null;
            $payment_method = $args['payment_method'] ?? null;
            $customer_email = $args['customer_email'] ?? null;
            $min_total = $args['min_total'] ?? null;
            $max_total = $args['max_total'] ?? null;
            $filters = is_array($args['filters'] ?? null) ? $args['filters'] : [];

            // בסיס לשאילתה ל-wc_get_orders
            $query = [
                'type' => 'shop_order',
                'status' => $statuses,
                'orderby' => 'date',
                'order' => 'DESC',
                'return' => 'objects',
            ];

            // טווח תאריכים
            if ($date_from || $date_to) {
                if (!$date_from) {
                    $date_from = gmdate('Y-m-d', strtotime('-1 month'));
                }
                if (!$date_to) {
                    $date_to = gmdate('Y-m-d');
                }
                $query['date_created'] = $date_from . '...' . $date_to;
            }

            // תשלום (תואם HPOS)
            if ($payment_method !== null && $payment_method !== '' && $payment_method !== []) {
                $ids = is_array($payment_method) ? array_values(array_filter($payment_method, 'strlen')) : [(string) $payment_method];
                $ids = array_values(array_filter($ids, fn($v) => preg_match('/^[A-Za-z0-9_\-]+$/', $v)));
                if (count($ids) === 1) {
                    $query['payment_method'] = $ids[0];
                } elseif (!empty($ids)) {
                    $query['payment_method'] = $ids;
                }
            }

            // meta_query לשדות נוספים
            $meta_query = ['relation' => 'AND'];

            if (!empty($customer_email)) {
                $meta_query[] = [
                    'key' => '_billing_email',
                    'value' => sanitize_text_field($customer_email),
                    'compare' => 'LIKE',
                ];
            }

            if ($min_total !== null) {
                $meta_query[] = [
                    'key' => '_order_total',
                    'value' => floatval($min_total),
                    'type' => 'DECIMAL',
                    'compare' => '>=',
                ];
            }

            if ($max_total !== null) {
                $meta_query[] = [
                    'key' => '_order_total',
                    'value' => floatval($max_total),
                    'type' => 'DECIMAL',
                    'compare' => '<=',
                ];
            }

            // פילטרים מותאמים
            if (!empty($filters['meta']) && is_array($filters['meta'])) {
                foreach ($filters['meta'] as $mq) {
                    $k = isset($mq['key']) ? (string) $mq['key'] : '';
                    if ($k === '')
                        continue;
                    $meta_query[] = [
                        'key' => $k,
                        'value' => $mq['value'] ?? '',
                        'compare' => $mq['compare'] ?? '=',
                        'type' => $mq['type'] ?? 'CHAR',
                    ];
                }
            }

            if (count($meta_query) > 1) {
                $query['meta_query'] = $meta_query;
            }

            // --- NEW: אסטרטגיית חיפוש אמינה ---
            // אם יש search, לא נסמוך על search הפנימי של WC (שלא עושה LIKE על ID).
            // נשלוף מועמדים לפי הפילטרים האחרים (סטטוס/טווח/תשלום/מטה), בלי עימוד, ואז נסנן ידנית.
            $orders = [];
            $total = 0;
            $total_pages = 1;

            if ($search !== null && $search !== '') {
                // שליפה "רחבה" של מועמדים (מוגבל קשיח לביצועים)
                $hard_cap = 5000; // אפשר לכוון לפי היקף חנות
                $query_no_paginate = $query;
                $query_no_paginate['limit'] = $hard_cap;
                // חשוב: בלי 'paginate' ובלי 'search'
                unset($query_no_paginate['paginate']);

                $candidates = wc_get_orders($query_no_paginate);
                $filtered = [];
                foreach ($candidates as $order_obj) {
                    if (!$order_obj instanceof WC_Order) {
                        $maybe = wc_get_order(is_object($order_obj) && isset($order_obj->ID) ? $order_obj->ID : $order_obj);
                        if (!$maybe)
                            continue;
                        $order_obj = $maybe;
                    }
                    if ($this->order_matches_search($order_obj, $search)) {
                        $filtered[] = $order_obj;
                    }
                }

                // פאג'ינציה ידנית על התוצאה המסוננת
                $total = count($filtered);
                $per_page_eff = ($per_page === -1) ? max(1, $total) : max(1, $per_page);
                $total_pages = max(1, (int) ceil($total / $per_page_eff));
                $offset = ($page - 1) * $per_page_eff;
                $orders = array_slice($filtered, $offset, $per_page_eff);
            } else {
                // בלי search – השתמש בעימוד הרגיל של WC
                if ($paginate) {
                    $query['paginate'] = true;
                    $query['page'] = $page;
                    $query['limit'] = max(1, ($per_page === -1 ? 100 : $per_page));
                } else {
                    $query['limit'] = -1;
                }

                $result = wc_get_orders($query);

                if ($paginate) {
                    $orders = is_array($result) && isset($result['orders']) ? $result['orders'] : ($result->orders ?? []);
                    $total = is_array($result) && isset($result['total']) ? intval($result['total']) : intval($result->total ?? 0);
                    $total_pages = is_array($result) && isset($result['max_num_pages']) ? intval($result['max_num_pages']) : intval($result->max_num_pages ?? 1);
                } else {
                    $orders = is_array($result) ? $result : ($result ?? []);
                    $total = is_array($orders) ? count($orders) : 0;
                    $total_pages = 1;
                }
            }

            // בניית rows
            $rows = [];
            foreach ($orders as $order) {
                if (!$order instanceof WC_Order) {
                    $maybe = wc_get_order(is_object($order) && isset($order->ID) ? $order->ID : $order);
                    if (!$maybe)
                        continue;
                    $order = $maybe;
                }
                $rows[] = $this->build_order_row($order);
            }

            return [
                'ok' => true,
                'page' => ($search !== null ? $page : ($paginate ? $page : 1)),
                'per_page' => ($search !== null
                    ? ($per_page === -1 ? count($rows) : $per_page)
                    : ($paginate ? ($per_page === -1 ? ($query['limit'] ?? 100) : $per_page) : $total)),
                'total' => $total,
                'total_pages' => $total_pages,
                'rows' => array_values($rows),
                'applied' => [
                    'status' => $statuses,
                    'date_from' => $date_from,
                    'date_to' => $date_to,
                    'payment_method' => $payment_method,
                    'customer_email' => $customer_email,
                    'min_total' => $min_total,
                    'max_total' => $max_total,
                    'search' => $search, // NEW
                ],
            ];
        }

        /**
         * NEW: התאמת הזמנה למחרוזת חיפוש (LIKE על הרבה שדות, כולל ID כמחרוזת)
         */
        private function order_matches_search(WC_Order $order, string $term): bool
        {
            $needle = mb_strtolower($term);

            // 1) מזהים/מספרים
            $id_str = (string) $order->get_id();
            $number_str = (string) $order->get_order_number();
            $txn = (string) $order->get_transaction_id();

            if (
                ($id_str !== '' && str_contains($id_str, $needle)) ||
                ($number_str !== '' && str_contains(mb_strtolower($number_str), $needle)) ||
                ($txn !== '' && str_contains(mb_strtolower($txn), $needle))
            ) {
                return true;
            }

            // 2) פרטי חיוב/משלוח
            $fields = [];
            $billing = $order->get_address('billing');
            $shipping = $order->get_address('shipping');

            foreach (['first_name', 'last_name', 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'country', 'email', 'phone'] as $k) {
                $fields[] = (string) ($billing[$k] ?? '');
                $fields[] = (string) ($shipping[$k] ?? '');
            }

            foreach ($fields as $v) {
                if ($v !== '' && str_contains(mb_strtolower($v), $needle))
                    return true;
            }

            // 3) תיאור אמצעי תשלום/מקור
            $pm = (string) $order->get_payment_method_title();
            $src = $this->get_order_attribution_meta($order);
            $src_fields = [
                $pm,
                $src['label'] ?? '',
                $src['utm_source'] ?? '',
                $src['utm_medium'] ?? '',
                $src['utm_campaign'] ?? '',
                $src['referring_domain'] ?? '',
            ];
            foreach ($src_fields as $v) {
                if ($v !== '' && str_contains(mb_strtolower($v), $needle))
                    return true;
            }

            // 4) פריטים בקופה – שם מוצר / SKU
            foreach ($order->get_items() as $item) {
                $name = (string) $item->get_name();
                if ($name !== '' && str_contains(mb_strtolower($name), $needle))
                    return true;

                $product = $item->get_product();
                if ($product) {
                    $sku = (string) $product->get_sku();
                    if ($sku !== '' && str_contains(mb_strtolower($sku), $needle))
                        return true;
                }
            }

            // 5) הערות לקוח/הזמנה
            $cust_note = (string) $order->get_customer_note();
            if ($cust_note !== '' && str_contains(mb_strtolower($cust_note), $needle))
                return true;

            $notes = wc_get_order_notes([
                'order_id' => $order->get_id(),
                'orderby' => 'date_created',
                'order' => 'ASC',
            ]);
            foreach ($notes as $note) {
                $content = (string) $note->content;
                if ($content !== '' && str_contains(mb_strtolower($content), $needle))
                    return true;
            }

            return false;
        }


        /**
         * בנאי שורה בודדת להזמנה — כולל יצירת subRows של Refunds (ללא שדה refunds).
         */
        private function build_order_row(WC_Order $order): array
        {
            // הערות
            $notes = wc_get_order_notes([
                'order_id' => $order->get_id(),
                'orderby' => 'date_created',
                'order' => 'ASC',
            ]);
            $order_notes = [];
            foreach ($notes as $note) {
                $order_notes[] = [
                    'id' => $note->id,
                    'content' => $note->content,
                    'date' => $note->date_created->date('Y-m-d H:i:s'),
                    'added_by' => $note->added_by,
                    'customer_note' => (bool) $note->customer_note,
                ];
            }
            if ($order->get_customer_note()) {
                $order_notes[] = [
                    'id' => 'customer_note',
                    'content' => $order->get_customer_note(),
                    'date' => $order->get_date_created() ? $order->get_date_created()->date('Y-m-d H:i:s') : current_time('Y-m-d H:i:s'),
                    'added_by' => 'Customer',
                    'customer_note' => true,
                ];
            }

            $data = [
                'id' => $order->get_id(),
                'parent_id' => 0,
                'version' => $order->get_version(),
                'status' => $order->get_status(),
                'currency' => $order->get_currency(),
                'subRows' => [], // כאן יכנסו ההחזרים בלבד
                'currency_symbol' => get_woocommerce_currency_symbol($order->get_currency()),
                'date' => $order->get_date_created() ? $order->get_date_created()->format('c') : null,
                'date_created_gmt' => $order->get_date_created() ? gmdate('c', $order->get_date_created()->getTimestamp()) : null,
                'date_modified' => $order->get_date_modified() ? $order->get_date_modified()->date('Y-m-d H:i:s') : null,
                'date_modified_gmt' => $order->get_date_modified() ? $order->get_date_modified()->date('Y-m-d H:i:s', true) : null,
                'total' => $order->get_total(),
                'meta_data' => $order->get_meta_data(),
                'line_items' => $this->get_order_items($order),
                'shipping_lines' => $this->get_shipping_lines($order),
                'fee_lines' => $this->get_fee_lines($order),
                'tax_lines' => $order->get_tax_totals(),
                'number' => $order->get_order_number(),
                'order_key' => $order->get_order_key(),
                'created_via' => $order->get_created_via(),
                'discount_total' => $order->get_discount_total(),
                'discount_tax' => $order->get_discount_tax(),
                'shipping_total' => $order->get_shipping_total(),
                'shipping_tax' => $order->get_shipping_tax(),
                'cart_tax' => $order->get_cart_tax(),
                'total_tax' => $order->get_total_tax(),
                'prices_include_tax' => $order->get_prices_include_tax(),
                'customer_id' => $order->get_customer_id(),
                'customer_ip_address' => $order->get_customer_ip_address(),
                'customer_user_agent' => $order->get_customer_user_agent(),
                'customer_note' => $order->get_customer_note(),
                'source' => $this->get_order_attribution_meta($order),
                'billing' => $order->get_address('billing'),
                'shipping' => $order->get_address('shipping'),
                'payment_method' => $order->get_payment_method() ?: 'UNKNOWN',
                'payment_method_title' => $order->get_payment_method_title(),
                'transaction_id' => $order->get_transaction_id() ?: ($order->get_meta('_transaction_id') ?: null),
                'date_paid' => $order->get_date_paid() ? $order->get_date_paid()->date('Y-m-d H:i:s') : null,
                'date_paid_gmt' => $order->get_date_paid() ? $order->get_date_paid()->date('Y-m-d H:i:s', true) : null,
                'date_completed' => $order->get_date_completed() ? $order->get_date_completed()->date('Y-m-d H:i:s') : null,
                'date_completed_gmt' => $order->get_date_completed() ? $order->get_date_completed()->date('Y-m-d H:i:s', true) : null,
                'cart_hash' => $order->get_cart_hash(),
                'coupon_lines' => $this->get_coupon_lines($order),

                // בכוונה אין 'refunds' כדי לא ליצור כפילות מול subRows
                'order_notes' => $order_notes,
            ];

            // Refunds כ־subRows בלבד
            foreach ($order->get_refunds() as $refund) {
                $data['subRows'][] = [
                    'id' => $refund->get_id(),
                    'parent_id' => $order->get_id(),
                    'status' => 'refunded',
                    'total' => (string) $refund->get_amount(),
                    'refund_reason' => $refund->get_reason(),
                    'date' => $refund->get_date_created() ? $refund->get_date_created()->date('Y-m-d H:i:s') : null,
                    'meta_data' => array_map(fn($m) => ['key' => $m->key, 'value' => $m->value], $refund->get_meta_data()),
                ];
            }

            return $data;
        }

        // === Helpers (ללא שינוי מהותי) ===

        private function get_order_items($order)
        {
            $items = [];
            foreach ($order->get_items() as $item_id => $item) {
                $product = $item->get_product();
                $image_url = null;

                if ($product) {
                    $image_id = $product->get_image_id();
                    if (!$image_id && $item->get_variation_id() > 0) {
                        $parent_product = wc_get_product($item->get_product_id());
                        if ($parent_product) {
                            $image_id = $parent_product->get_image_id();
                        }
                    }
                    if ($image_id) {
                        $image_src = wp_get_attachment_image_src($image_id, 'thumbnail');
                        $image_url = $image_src ? $image_src[0] : null;
                    }
                }
                if (!$image_url) {
                    $image_url = wc_placeholder_img_src('thumbnail');
                }

                $raw_taxes = $item->get_taxes();
                $formatted_taxes = [];
                if (!empty($raw_taxes['total'])) {
                    foreach ($raw_taxes['total'] as $tax_rate_id => $total_tax_amount) {
                        $subtotal_tax_amount = $raw_taxes['subtotal'][$tax_rate_id] ?? '0';
                        $formatted_taxes[] = [
                            'id' => (int) $tax_rate_id,
                            'total' => (string) $total_tax_amount,
                            'subtotal' => (string) $subtotal_tax_amount,
                        ];
                    }
                }

                $items[] = [
                    'id' => $item_id,
                    'name' => $item->get_name(),
                    'product_id' => $item->get_product_id(),
                    'variation_id' => $item->get_variation_id(),
                    'quantity' => $item->get_quantity(),
                    'tax_class' => $item->get_tax_class() ?? '',
                    'subtotal' => (string) $item->get_subtotal(),
                    'subtotal_tax' => (string) $item->get_subtotal_tax(),
                    'total' => (string) $item->get_total(),
                    'total_tax' => (string) $item->get_total_tax(),
                    'taxes' => $formatted_taxes,
                    'meta_data' => array_map(fn($meta) => ['key' => $meta->key, 'value' => $meta->value], $item->get_meta_data()),
                    'sku' => $product ? $product->get_sku() : '',
                    'price' => $product ? (float) $product->get_price() : ($item->get_quantity() > 0 ? (float) $item->get_total() / $item->get_quantity() : 0),
                    'image' => $image_url,
                ];
            }
            return $items;
        }

        private function get_shipping_lines($order)
        {
            $shipping_lines = [];
            foreach ($order->get_items('shipping') as $item_id => $item) {
                $taxes_array = [];
                $taxes = $item->get_taxes();
                if (is_array($taxes) && isset($taxes['total'])) {
                    foreach ($taxes['total'] as $rate_id => $total) {
                        $taxes_array[] = [
                            'rate_id' => (int) $rate_id,
                            'total' => (string) wc_format_decimal($total, 2),
                        ];
                    }
                }
                $shipping_lines[] = [
                    'id' => $item_id,
                    'method_title' => $item->get_name(),
                    'method_id' => $item->get_method_id(),
                    'total' => (string) $item->get_total(),
                    'total_tax' => (string) $item->get_total_tax(),
                    'taxes' => $taxes_array,
                    'meta_data' => array_map(fn($meta) => ['key' => $meta->key, 'value' => $meta->value], $item->get_meta_data()),
                ];
            }
            return $shipping_lines;
        }

        private function get_fee_lines($order)
        {
            $fees = [];
            foreach ($order->get_items('fee') as $item_id => $item) {
                $fees[] = [
                    'id' => $item_id,
                    'name' => $item->get_name(),
                    'total' => (string) $item->get_total(),
                    'total_tax' => (string) $item->get_total_tax(),
                    'tax_class' => $item->get_tax_class(),
                    'taxes' => $item->get_taxes(),
                    'meta_data' => array_map(fn($meta) => ['key' => $meta->key, 'value' => $meta->value], $item->get_meta_data()),
                ];
            }
            return $fees;
        }

        private function get_coupon_lines($order)
        {
            $coupons = [];
            foreach ($order->get_items('coupon') as $item_id => $item) {
                $coupons[] = [
                    'id' => $item_id,
                    'code' => $item->get_code(),
                    'discount' => (string) $item->get_discount(),
                    'discount_tax' => (string) $item->get_discount_tax(),
                    'meta_data' => array_map(fn($meta) => ['key' => $meta->key, 'value' => $meta->value], $item->get_meta_data()),
                ];
            }
            return $coupons;
        }

        private function get_order_attribution_meta(WC_Abstract_Order $order): array
        {
            $p = '_wc_order_attribution_';

            $source_type = (string) $order->get_meta($p . 'source_type');
            $utm_source = (string) $order->get_meta($p . 'utm_source');
            $utm_medium = (string) $order->get_meta($p . 'utm_medium');
            $utm_campaign = (string) $order->get_meta($p . 'utm_campaign');
            $utm_content = (string) $order->get_meta($p . 'utm_content');
            $utm_term = (string) $order->get_meta($p . 'utm_term');
            $referrer = (string) $order->get_meta($p . 'referrer');
            $referring_domain = (string) $order->get_meta($p . 'referring_domain');
            $device_type = (string) $order->get_meta($p . 'device_type');
            $session_pv = (int) $order->get_meta($p . 'session_page_views');

            $has_any_attr = (bool) array_filter([
                $source_type,
                $utm_source,
                $utm_medium,
                $utm_campaign,
                $utm_content,
                $utm_term,
                $referrer,
                $referring_domain,
            ]);

            $legacy_source = $order->get_meta('_wc_source') ?: $order->get_meta('_order_source');

            $label = 'Unknown';
            if ($source_type === 'utm' && ($utm_source || $utm_medium || $utm_campaign)) {
                $label = ($utm_source && $utm_medium)
                    ? sprintf('%s / %s%s', $utm_source, $utm_medium, $utm_campaign ? " · {$utm_campaign}" : '')
                    : ($utm_source ?: 'UTM');
            } elseif ($source_type === 'referral') {
                $host = $referring_domain ?: (wp_parse_url($referrer, PHP_URL_HOST) ?: $referrer);
                $label = $host ?: 'Referral';
            } elseif ($source_type === 'admin') {
                $label = 'Admin';
            } elseif ($source_type === 'typein' || $source_type === 'direct') {
                $label = 'Direct';
            } elseif (!$has_any_attr && $legacy_source) {
                $label = (string) $legacy_source;
            }

            return [
                'label' => $label,
                'source_type' => $source_type,
                'utm_source' => $utm_source,
                'utm_medium' => $utm_medium,
                'utm_campaign' => $utm_campaign,
                'utm_content' => $utm_content,
                'utm_term' => $utm_term,
                'referrer' => $referrer,
                'referring_domain' => $referring_domain,
                'device_type' => $device_type,
                'session_page_views' => $session_pv,
                'legacy_source' => $legacy_source ?: '',
            ];
        }

        // === עטיפת "30 הימים האחרונים" על אותו API מאוחד ===
        public function get_last_30_days_orders()
        {
            return $this->get_orders([
                'date_from' => gmdate('Y-m-d', strtotime('-1 month')),
                'date_to'   => gmdate('Y-m-d'),
                'paginate'  => false,
            ]);
        }


        /**
         * דוגמה: קבלת רשימת מפתחות meta מותאמים אישית
         */
        public function get_all_custom_order_meta_keys($limit = 200)
        {
            $args = [
                'type' => 'shop_order',
                'status' => ['completed', 'processing', 'on-hold', 'pending', 'cancelled', 'refunded', 'failed'],
                'limit' => $limit,
                'orderby' => 'date',
                'order' => 'DESC',
                'return' => 'objects',
            ];

            $orders = wc_get_orders($args);
            $custom_meta_keys = [];

            foreach ($orders as $order) {
                foreach ($order->get_meta_data() as $meta) {
                    if (strpos($meta->key, '_') !== 0) {
                        $custom_meta_keys[$meta->key] = true;
                    }
                }
            }

            return array_keys($custom_meta_keys);
        }
    }
}
