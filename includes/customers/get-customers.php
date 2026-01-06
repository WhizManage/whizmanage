<?php
if (!class_exists('WhizManage_Customers')) {

    class WhizManage_Customers
    {

        /**
         * API מאוחד ללקוחות
         *
         * args אפשריים:
         * - page (int, 1+)
         * - per_page (int, 1+)
         * - roles (array|string) – למשל ['customer','subscriber']
         * - search (string)      – חיפוש חופשי (ID, אימייל, שם, טלפון וכו')
         *
         * מחזיר:
         * [
         *   'ok'          => bool,
         *   'page'        => int,
         *   'per_page'    => int,
         *   'total'       => int,
         *   'total_pages' => int,
         *   'rows'        => array,
         *   'applied'     => array,
         * ]
         */
        public function get_customers(array $args = []): array
        {
            $page = max(1, intval($args['page'] ?? 1));
            $per_page = max(1, intval($args['per_page'] ?? 100));
            $search = isset($args['search']) && strlen(trim((string) $args['search'])) ? trim((string) $args['search']) : '';
            $include_orders = !empty($args['include_orders']);

            // תמיכה ב-is_paying_customer (true/false/null)
            $ipc = array_key_exists('is_paying_customer', $args) ? $args['is_paying_customer'] : null;

            // ---- תפקיד יחיד בלבד ----
            $role = isset($args['role']) ? strtolower(trim((string) $args['role'])) : 'customer';
            if ($role !== 'customer') {
                $role = 'customer';
            }
            $roles = ['customer'];

            $query_args = [
                'number' => $per_page,
                'paged' => $page,
                'role__in' => $roles,
                'orderby' => 'ID',
                'order' => 'DESC',
            ];

            if ($search !== '') {
                $query_args['search'] = '*' . esc_attr($search) . '*';
                $query_args['search_columns'] = ['user_login', 'user_email', 'display_name', 'user_nicename'];
            }

            // אם צריך לסנן לפי משלמים/לא משלמים – שליפה רחבה + סינון ידני + עימוד ידני
            $do_manual_pagination = ($ipc !== null);

            if ($do_manual_pagination) {
                $wide_args = $query_args;
                unset($wide_args['number'], $wide_args['paged']);
                $wide_args['number'] = 5000; // הגבלה סבירה לפי אתר
                $wide_args['paged'] = 1;

                $uq = new WP_User_Query($wide_args);
                $users_all = $uq->get_results();

                $rows_all = [];
                foreach ($users_all as $user) {
                    if ($user instanceof WP_User) {
                        $rows_all[] = $this->build_customer_row($user, $include_orders);
                    }
                }

                $rows_f = array_values(array_filter($rows_all, function ($r) use ($ipc) {
                    $val = !empty($r['is_paying_customer']);
                    return ($ipc === null) ? true : ($val === (bool) $ipc);
                }));

                $total = count($rows_f);
                $per_page_eff = max(1, $per_page);
                $total_pages = max(1, (int) ceil($total / $per_page_eff));
                $offset = ($page - 1) * $per_page_eff;
                $rows = array_slice($rows_f, $offset, $per_page_eff);

                return [
                    'ok' => true,
                    'page' => $page,
                    'per_page' => $per_page_eff,
                    'total' => $total,
                    'total_pages' => $total_pages,
                    'rows' => array_values($rows),
                    'applied' => [
                        'role' => $role,
                        'search' => $search,
                        'is_paying_customer' => $ipc,
                    ],
                ];
            }

            // מקרה רגיל – עימוד ע"י WP_User_Query
            $user_query = new WP_User_Query($query_args);
            $users = $user_query->get_results();
            $total = intval($user_query->get_total());
            $total_pages = max(1, (int) ceil($total / $per_page));

            $rows = [];
            foreach ($users as $user) {
                if ($user instanceof WP_User) {
                    $rows[] = $this->build_customer_row($user, $include_orders);
                }
            }

            return [
                'ok' => true,
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $total_pages,
                'rows' => array_values($rows),
                'applied' => [
                    'role' => $role,
                    'search' => $search,
                ],
            ];
        }

        /**
         * שליפת הזמנות של לקוח ספציפי
         * מחזיר מערך של הזמנות עם פרטים מלאים לצורך OrderSummaryModal
         */
        public function get_customer_orders(int $customer_id, int $limit = 10): array
        {
            $orders = wc_get_orders([
                'customer_id' => $customer_id,
                'limit' => $limit,
                'orderby' => 'date',
                'order' => 'DESC',
                'return' => 'objects',
                'status' => ['completed', 'processing', 'on-hold', 'pending', 'cancelled', 'refunded', 'failed'],
            ]);

            $rows = [];
            foreach ($orders as $order) {
                if (!$order instanceof WC_Order) continue;

                $line_items = [];
                foreach ($order->get_items() as $item_id => $item) {
                    $product = $item->get_product();
                    $image_url = $product ? wp_get_attachment_image_src($product->get_image_id(), 'thumbnail')[0] ?? wc_placeholder_img_src('thumbnail') : wc_placeholder_img_src('thumbnail');
                    
                    $line_items[] = [
                        'id' => $item_id,
                        'name' => $item->get_name(),
                        'quantity' => $item->get_quantity(),
                        'total' => (string) $item->get_total(),
                        'image' => $image_url,
                    ];
                }

                $coupon_lines = [];
                foreach ($order->get_items('coupon') as $item_id => $item) {
                    $coupon_lines[] = [
                        'id' => $item_id,
                        'code' => $item->get_code(),
                        'discount' => (string) $item->get_discount(),
                    ];
                }

                $rows[] = [
                    'id' => $order->get_id(),
                    'status' => $order->get_status(),
                    'total' => $order->get_total(),
                    'currency_symbol' => get_woocommerce_currency_symbol($order->get_currency()),
                    'date' => $order->get_date_created() ? $order->get_date_created()->format('c') : null,
                    'date_created' => $order->get_date_created() ? $order->get_date_created()->format('c') : null,
                    'billing' => $order->get_address('billing'),
                    'shipping' => $order->get_address('shipping'),
                    'payment_method' => $order->get_payment_method(),
                    'payment_method_title' => $order->get_payment_method_title(),
                    'line_items' => $line_items,
                    'coupon_lines' => $coupon_lines,
                    'meta_data' => array_map(fn($m) => ['key' => $m->key, 'value' => $m->value], $order->get_meta_data()),
                ];
            }

            return ['ok' => true, 'orders' => $rows];
        }

        /**
         * בניית שורה בודדת – במבנה מאוד דומה ל-wc/v3/customers,
         * ועוד השדות שאתה משתמש בהם בטבלה (orders_count, total_spent וכו').
         */
        private function build_customer_row(WP_User $user, bool $include_orders = false): array
        {
            $user_id = $user->ID;

            // WooCommerce customer אובייקט – בשביל התאריכים וכו'
            $customer = new WC_Customer($user_id);

            $roles = (array) $user->roles;
            $role = in_array('customer', $roles, true)
                ? 'customer'
                : (in_array('subscriber', $roles, true) ? 'subscriber' : ($roles[0] ?? ''));

            $billing = [
                'first_name' => (string) get_user_meta($user_id, 'billing_first_name', true),
                'last_name' => (string) get_user_meta($user_id, 'billing_last_name', true),
                'company' => (string) get_user_meta($user_id, 'billing_company', true),
                'address_1' => (string) get_user_meta($user_id, 'billing_address_1', true),
                'address_2' => (string) get_user_meta($user_id, 'billing_address_2', true),
                'city' => (string) get_user_meta($user_id, 'billing_city', true),
                'postcode' => (string) get_user_meta($user_id, 'billing_postcode', true),
                'country' => (string) get_user_meta($user_id, 'billing_country', true),
                'state' => (string) get_user_meta($user_id, 'billing_state', true),
                'email' => (string) get_user_meta($user_id, 'billing_email', true) ?: $user->user_email,
                'phone' => (string) get_user_meta($user_id, 'billing_phone', true),
            ];

            $shipping = [
                'first_name' => (string) get_user_meta($user_id, 'shipping_first_name', true),
                'last_name' => (string) get_user_meta($user_id, 'shipping_last_name', true),
                'company' => (string) get_user_meta($user_id, 'shipping_company', true),
                'address_1' => (string) get_user_meta($user_id, 'shipping_address_1', true),
                'address_2' => (string) get_user_meta($user_id, 'shipping_address_2', true),
                'city' => (string) get_user_meta($user_id, 'shipping_city', true),
                'postcode' => (string) get_user_meta($user_id, 'shipping_postcode', true),
                'country' => (string) get_user_meta($user_id, 'shipping_country', true),
                'state' => (string) get_user_meta($user_id, 'shipping_state', true),
                'phone' => (string) get_user_meta($user_id, 'shipping_phone', true),
            ];

            // ספירת הזמנות וסך הכל
            $orders_count = function_exists('wc_get_customer_order_count')
                ? (int) wc_get_customer_order_count($user_id)
                : 0;

            $total_spent = function_exists('wc_get_customer_total_spent')
                ? (float) wc_get_customer_total_spent($user_id)
                : 0.0;

            // meta_data (בפורמט של Woo)
            $meta_data = [];
            $all_meta = get_user_meta($user_id);
            foreach ($all_meta as $key => $values) {
                // אם לא רוצים כל המטא (כי זה הרבה) אפשר להגביל כאן
                foreach ((array) $values as $v) {
                    $meta_data[] = [
                        'key' => $key,
                        'value' => maybe_unserialize($v),
                    ];
                }
            }

            $date_created = $customer->get_date_created();
            $date_created_gmt = $date_created ? $date_created->date('c', true) : null;

            $date_modified = $customer->get_date_modified();
            $date_modified_gmt = $date_modified ? $date_modified->date('c', true) : null;

            $row = [
                'id' => $user_id,
                'email' => $user->user_email,
                'first_name' => $billing['first_name'] ?: (string) get_user_meta($user_id, 'first_name', true),
                'last_name' => $billing['last_name'] ?: (string) get_user_meta($user_id, 'last_name', true),
                'role' => $role,
                'username' => $user->user_login,
                'date_created' => $date_created ? $date_created->date('c') : null,
                'date_created_gmt' => $date_created_gmt,
                'date_modified' => $date_modified ? $date_modified->date('c') : null,
                'date_modified_gmt' => $date_modified_gmt,
                'billing' => $billing,
                'shipping' => $shipping,
                'is_paying_customer' => $orders_count > 0,
                'orders_count' => $orders_count,
                'total_spent' => wc_format_decimal($total_spent, 2),
                'avatar_url' => get_avatar_url($user_id, ['size' => 96]),
                'meta_data' => $meta_data,
            ];

            // הוספת הזמנות אם נדרש
            if ($include_orders && $orders_count > 0) {
                $row['orders'] = $this->get_customer_orders($user_id)['orders'];
            }

            return $row;
        }
    }
}
