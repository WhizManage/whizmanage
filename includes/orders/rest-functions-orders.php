<?php
if (! defined('ABSPATH')) {
    exit;
}
require_once WHIZMANAGE_DIR . 'includes/orders/get-orders.php';

if (!class_exists('Whizmanage_rest_functions_orders')) {
    class Whizmanage_rest_functions_orders
    {

        public function __construct()
        {
            add_action('rest_api_init', [$this, 'register_api_endpoints']);
        }

        public function register_api_endpoints()
        {
            register_rest_route('whizmanage/v1', '/get_orders/', [
                'methods' => 'GET',
                'callback' => [$this, 'get_orders_endpoint'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('wm/v1', '/order-statuses', [
                'methods' => 'GET',
                'callback' => [$this, 'handle_get_order_statuses'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('whizmanage/v1', '/check_coupons/', [
                'methods' => 'POST',
                'callback' => [$this, 'check_coupons'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('wm/v1', '/order_note', [
                'methods' => 'POST',
                'callback' => [$this, 'handle_add_order_note'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('wm/v1', '/order_note/(?P<note_id>\\d+)', [
                'methods' => 'DELETE',
                'callback' => [$this, 'handle_delete_order_note'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route("whizmanage/v1", "/refund/", [
                'methods' => 'POST',
                'callback' => [$this, 'refund_order'],
                'permission_callback' => [$this, 'check_permissions']
            ]);

            register_rest_route('wm/v1', '/orders/(?P<id>\d+)/send-email', [
                'methods' => 'POST',
                'callback' => [$this, 'handle_send_email'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('wm/v1', '/orders/(?P<id>\d+)/send-order-details', [
                'methods' => 'POST',
                'callback' => [$this, 'handle_send_order_details'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('wm/v1', '/orders/(?P<id>\d+)/regenerate-downloads', [
                'methods' => 'POST',
                'callback' => [$this, 'handle_regenerate_downloads'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            register_rest_route('wm/v1', '/orders/(?P<id>\d+)/available-emails', [
                'methods' => 'GET',
                'callback' => [$this, 'handle_list_available_emails'],
                'permission_callback' => [$this, 'check_permissions'],
            ]);

            // --- Custom Field Keys: שמירה/שליפה של מערך המפתחות להצגה ---
            register_rest_route('wm/v1', '/summary-meta-fields', [
                'methods' => 'GET',
                'callback' => [$this, 'handle_get_custom_field_keys'],
                'permission_callback' => [$this, 'check_permissions'], // יש לך כבר
            ]);

            register_rest_route('wm/v1', '/summary-meta-fields', [
                'methods' => 'POST',
                'callback' => [$this, 'handle_save_custom_field_keys'],
                'permission_callback' => [$this, 'check_permissions'],
                'args' => [
                    'keys' => [
                        'type' => 'array',
                        'required' => true,
                        'items' => ['type' => 'string'],
                    ],
                ],
            ]);
        }

        /**
         * GET /wp-json/wm/v1/order-statuses
         * מחזיר את כל סטטוסי ההזמנות הרשומים ב-WooCommerce (כולל מותאמים אישית).
         * המפתחות מוחזרים ללא הקידומת 'wc-' כדי להתאים ל-$order->get_status().
         */
        public function handle_get_order_statuses(WP_REST_Request $req)
        {
            $statuses = array();
            if (function_exists('wc_get_order_statuses')) {
                foreach (wc_get_order_statuses() as $key => $label) {
                    $clean_key = (strpos($key, 'wc-') === 0) ? substr($key, 3) : $key;
                    $statuses[$clean_key] = $label;
                }
            }
            return rest_ensure_response((object) $statuses);
        }

        /**
         * GET /wp-json/wm/v1/summary-meta-fields
         * מחזיר את מערך המפתחות כפי שהוא שמור ב-wp_options
         */
        public function handle_get_custom_field_keys(WP_REST_Request $req)
        {
            $keys = get_option('summary_meta_fields', []);
            if (!is_array($keys)) {
                $keys = [];
            }
            // סניטציה עדינה (לא חובה אם כבר מבוקר אצלך)
            $keys = array_values(array_filter(array_map('sanitize_key', $keys)));
            return rest_ensure_response($keys);
        }

        /**
         * POST /wp-json/wm/v1/summary-meta-fields
         * גוף: { "keys": ["tyoe","gift_wrap", ...] }
         * שומר מעודכן ב-wp_options ומחזיר את המערך לאחר סניטציה
         */
        public function handle_save_custom_field_keys(WP_REST_Request $req)
        {
            $incoming = $req->get_param('keys');
            if (!is_array($incoming)) {
                return new WP_Error('bad_request', 'keys must be array', ['status' => 400]);
            }

            $clean = [];
            foreach ($incoming as $k) {
                $sk = sanitize_key((string) $k);
                if ($sk !== '') {
                    $clean[] = $sk;
                }
            }
            $clean = array_values(array_unique($clean));

            update_option('summary_meta_fields', $clean, false);

            return rest_ensure_response([
                'ok' => true,
                'keys' => $clean,
            ]);
        }

        public function handle_send_order_details(WP_REST_Request $req)
        {
            $order_id = absint($req['id']);
            $order = wc_get_order($order_id);
            if (!$order) {
                return new WP_Error('not_found', 'Order not found', array('status' => 404));
            }

            $params = $req->get_json_params();
            $override = (!empty($params['email']) && is_email($params['email']))
                ? sanitize_email($params['email'])
                : null;

            $mailer = WC()->mailer();
            $emails = $mailer->get_emails();

            if (!empty($emails['WC_Email_Customer_Invoice'])) {
                $email_obj = $emails['WC_Email_Customer_Invoice'];
                $hook_name = 'woocommerce_email_recipient_customer_invoice';
                $added_hook = false;
                $callback = null;

                if ($override) {
                    $callback = function ($recipient, $email_obj_or_order) use ($override) {
                        return $override ? $override : $recipient;
                    };
                    add_filter($hook_name, $callback, 10, 2);
                    $added_hook = true;
                }

                try {
                    $email_obj->trigger($order_id, $order);
                } catch (Exception $e) {
                    if ($added_hook && $callback) {
                        remove_filter($hook_name, $callback, 10);
                    }
                    return new WP_Error('send_failed', 'Failed to send email: ' . $e->getMessage(), array('status' => 500));
                }

                if ($added_hook && $callback) {
                    remove_filter($hook_name, $callback, 10);
                }
            }

            return array('ok' => true, 'sent_to' => $override ? $override : $order->get_billing_email());
        }

        public function handle_send_email(WP_REST_Request $req)
        {
            $order_id = absint($req['id']);
            $order = wc_get_order($order_id);
            if (!$order) {
                return new WP_Error('not_found', 'Order not found', array('status' => 404));
            }

            $p = $req->get_json_params();
            $email_id = sanitize_text_field(isset($p['email_id']) ? $p['email_id'] : '');

            // כתובת חד-פעמית (אם סופקה)
            $override = '';
            if (!empty($p['override_email']) && is_email($p['override_email'])) {
                $override = sanitize_email($p['override_email']);
            } elseif (!empty($p['email']) && is_email($p['email'])) {
                $override = sanitize_email($p['email']);
            }

            // מיפוי תבניות -> קלאס, והוק recipient
            $classes = array(
                'wc_new_order' => 'WC_Email_New_Order',
                'customer_invoice' => 'WC_Email_Customer_Invoice',
                'customer_processing_order' => 'WC_Email_Customer_Processing_Order',
                'customer_completed_order' => 'WC_Email_Customer_Completed_Order',
                'customer_on_hold_order' => 'WC_Email_Customer_On_Hold_Order',
                'customer_refunded_order' => 'WC_Email_Customer_Refunded_Order',
            );
            $hooks = array(
                'wc_new_order' => 'woocommerce_email_recipient_new_order',
                'customer_invoice' => 'woocommerce_email_recipient_customer_invoice',
                'customer_processing_order' => 'woocommerce_email_recipient_customer_processing_order',
                'customer_completed_order' => 'woocommerce_email_recipient_customer_completed_order',
                'customer_on_hold_order' => 'woocommerce_email_recipient_customer_on_hold_order',
                'customer_refunded_order' => 'woocommerce_email_recipient_customer_refunded_order',
            );

            if (empty($classes[$email_id])) {
                return new WP_Error('unsupported', 'Unknown email_id', array('status' => 400));
            }

            // אימות שהתבנית רלוונטית ומופעלת להזמנה
            $req2 = new WP_REST_Request('GET', '');
            $req2->set_param('id', $order_id);
            $available = $this->handle_list_available_emails($req2);
            if (is_wp_error($available)) {
                return $available;
            }
            // polyfill ל-array_column
            $allowed_ids = array();
            if (!empty($available['templates']) && is_array($available['templates'])) {
                foreach ($available['templates'] as $tpl) {
                    if (isset($tpl['id'])) {
                        $allowed_ids[] = $tpl['id'];
                    }
                }
            }
            if (!in_array($email_id, $allowed_ids, true)) {
                return new WP_Error('forbidden', 'Email template not applicable for this order/status or disabled.', array('status' => 403));
            }

            $emails = WC()->mailer()->get_emails();
            $email = isset($emails[$classes[$email_id]]) ? $emails[$classes[$email_id]] : null;
            if (!$email) {
                return new WP_Error('missing', 'Email class not available', array('status' => 500));
            }

            // פילטר זמני ליעד הנמען (אם יש override)
            $callback = null;
            $hook = isset($hooks[$email_id]) ? $hooks[$email_id] : '';
            $added = false;

            if ($override && $hook) {
                $callback = function ($recipient) use ($override) {
                    return $override ? $override : $recipient;
                };
                add_filter($hook, $callback, 10, 1);
                $added = true;
            }

            try {
                $email->trigger($order_id, $order);

                $sent_to = $override ? $override : $order->get_billing_email();

                $order->add_order_note(
                    sprintf(
                        /* translators: 1: email ID, 2: recipient email address */
                        __('Email sent manually: %1$s to %2$s', 'whizmanage'),
                        $email_id,
                        $sent_to
                    ),
                    0,
                    true
                );
            } catch (Exception $e) {
                if ($added && $callback) {
                    remove_filter($hook, $callback, 10);
                }
                return new WP_Error('send_failed', 'Failed to send email: ' . $e->getMessage(), array('status' => 500));
            }

            if ($added && $callback) {
                remove_filter($hook, $callback, 10);
            }

            return array(
                'ok' => true,
                'email_id' => $email_id,
                'sent_to' => $override ? $override : $order->get_billing_email(),
                'message' => 'Email sent successfully',
            );
        }

        public function handle_list_available_emails(WP_REST_Request $req)
        {
            $order_id = absint($req['id']);
            $order = wc_get_order($order_id);
            if (!$order) {
                return new WP_Error('not_found', 'Order not found', array('status' => 404));
            }

            $status = $order->get_status();

            $template_map = array(
                'wc_new_order' => array('WC_Email_New_Order', 'New Order (Admin)', array()),
                'customer_invoice' => array('WC_Email_Customer_Invoice', 'Invoice / Order details', array()),
                'customer_processing_order' => array('WC_Email_Customer_Processing_Order', 'Processing order', array('processing')),
                'customer_completed_order' => array('WC_Email_Customer_Completed_Order', 'Completed order', array('completed')),
                'customer_on_hold_order' => array('WC_Email_Customer_On_Hold_Order', 'On hold', array('on-hold', 'pending')),
                'customer_refunded_order' => array('WC_Email_Customer_Refunded_Order', 'Refunded', array('refunded')),
            );

            $mailer = WC()->mailer();
            $emails = $mailer->get_emails();

            $available = array();

            foreach ($template_map as $id => $tuple) {
                $class = $tuple[0];
                $label = $tuple[1];
                $status_whitelist = $tuple[2];

                if (empty($emails[$class])) {
                    continue;
                }

                $email_obj = $emails[$class];

                if (method_exists($email_obj, 'is_enabled') && !$email_obj->is_enabled()) {
                    continue;
                }

                if (!empty($status_whitelist) && !in_array($status, $status_whitelist, true)) {
                    continue;
                }

                if ($id === 'customer_refunded_order') {
                    $refunds = $order->get_refunds();
                    if (empty($refunds)) {
                        continue;
                    }
                }

                $available[] = array(
                    'id' => $id,
                    'label' => $label,
                    'status_requirements' => $status_whitelist,
                    'current_status_compatible' => empty($status_whitelist) || in_array($status, $status_whitelist, true),
                );
            }

            return array(
                'ok' => true,
                'order_id' => $order_id,
                'status' => $status,
                'templates' => $available,
                'total_available' => count($available),
            );
        }

        public function handle_regenerate_downloads(WP_REST_Request $req)
        {
            $order_id = absint($req['id']);
            $order = wc_get_order($order_id);
            if (!$order) {
                return new WP_Error('not_found', 'Order not found', array('status' => 404));
            }

            if (function_exists('wc_downloadable_product_permissions')) {
                wc_downloadable_product_permissions($order_id, true);
            }

            return array('ok' => true);
        }

        public function refund_order($request)
        {
            $params = $request->get_json_params();
            $order_id = isset($params['order_id']) ? intval($params['order_id']) : 0;
            $amount = isset($params['amount']) ? (string) floatval($params['amount']) : '0';
            $reason = isset($params['reason']) ? sanitize_text_field($params['reason']) : '';
            $note = isset($params['note']) ? sanitize_textarea_field($params['note']) : '';
            $line_items = isset($params['line_items']) ? $params['line_items'] : [];
            $refund_method = isset($params['refund_method']) ? $params['refund_method'] : 'manual';

            if (!$order_id || (float) $amount <= 0) {
                return new WP_REST_Response(['error' => 'Invalid order ID or amount'], 400);
            }

            $order = wc_get_order($order_id);
            if (!$order) {
                return new WP_REST_Response(['error' => 'Order not found'], 404);
            }

            // *** בדיקות לשער התשלום לפני ניסיון החזר אוטומטי ***
            if ($refund_method === 'automatic') {
                $gateway_id = $order->get_payment_method();
                $gateways = WC()->payment_gateways()->payment_gateways();
                $gateway = $gateways[$gateway_id] ?? null;

                if (!$gateway) {
                    return new WP_REST_Response(['error' => 'Payment gateway not found on order'], 400);
                }
                if (!$gateway->supports('refunds')) {
                    return new WP_REST_Response(['error' => 'This payment gateway does not support automatic refunds'], 400);
                }
                if (!$order->get_transaction_id()) {
                    return new WP_REST_Response(['error' => 'Missing transaction ID on order; cannot process automatic refund'], 400);
                }
            }

            // בניית line_items בבטחה
            $refund_line_items = [];
            foreach ($line_items as $item) {
                if (!isset($item['id'], $item['qty'], $item['refund_total'])) {
                    continue;
                }

                $item_id = intval($item['id']);
                $order_item = $order->get_item($item_id); // בטוח יותר מ-$order->get_items()[$id]
                if (!$order_item) {
                    continue;
                }

                $refund_qty = max(0, intval($item['qty']));
                $item_total = (float) $order_item->get_total();
                $refund_total = (float) $item['refund_total'];

                // הגנות חלקיות
                $item_qty = (int) $order_item->get_quantity();
                if ($refund_qty > $item_qty)
                    $refund_qty = $item_qty;
                if ($refund_total > $item_total)
                    $refund_total = $item_total;

                // מסים ביחס לסכום – הימנע מחלוקה ב-0
                $refund_tax = [];
                if ($item_total > 0) {
                    $item_taxes = $order_item->get_taxes();
                    if (!empty($item_taxes['total'])) {
                        $tax_ratio = $refund_total / $item_total;
                        foreach ($item_taxes['total'] as $tax_id => $tax_amount) {
                            $refund_tax[$tax_id] = (float) $tax_amount * $tax_ratio;
                        }
                    }
                }

                $refund_line_items[$item_id] = [
                    'qty' => $refund_qty,
                    'refund_total' => wc_format_decimal($refund_total, 2),
                    'refund_tax' => array_map(function ($v) {
                        return wc_format_decimal($v, 2);
                    }, $refund_tax),
                ];
            }

            try {
                $refund_args = [
                    'amount' => wc_format_decimal($amount, 2),
                    'reason' => $reason,
                    'order_id' => $order_id,
                    'refund_payment' => ($refund_method === 'automatic'),
                    'restock_items' => true,
                    'line_items' => $refund_line_items,
                ];

                // לוג עזר
                wc_get_logger()->info('Attempt refund', ['source' => 'whizmanage_refund', 'args' => $refund_args]);

                $refund = wc_create_refund($refund_args);

                if (is_wp_error($refund)) {
                    wc_get_logger()->error('Refund error: ' . $refund->get_error_message(), ['source' => 'whizmanage_refund']);
                    return new WP_REST_Response(['error' => $refund->get_error_message()], 500);
                }

                if ($note && trim($note) !== '') {
                    $order->add_order_note($note, false, true);
                }

                $order = wc_get_order($order_id);

                return new WP_REST_Response([
                    'success' => true,
                    'refund_id' => $refund->get_id(),
                    'refund_amount' => $refund->get_amount(),
                    'message' => 'Refund processed successfully',
                    'order' => $order->get_data(),
                ], 200);
            } catch (Exception $e) {
                wc_get_logger()->error('Refund Exception: ' . $e->getMessage(), ['source' => 'whizmanage_refund']);
                return new WP_REST_Response(['error' => 'Failed to process refund: ' . $e->getMessage()], 500);
            }
        }
        public function get_orders_endpoint(WP_REST_Request $request)
        {
            $page = max(1, intval($request->get_param('page') ?: 1));
            $per_page_raw = $request->get_param('per_page');
            $per_page = ($per_page_raw === null) ? 100 : max(1, min(200, intval($per_page_raw)));

            $search = $request->get_param('search') ?: null;

            // ✅ קולט גם את שמות הפרמטרים שמגיעים מה-UI (date_from/date_to)
            $start_date = $request->get_param('date_from') ?: $request->get_param('start_date') ?: null;
            $end_date = $request->get_param('date_to') ?: $request->get_param('end_date') ?: null;

            // status: מחרוזת מופרדת בפסיקים או מערך
            $status = $request->get_param('status');
            if (is_string($status)) {
                $status = array_filter(array_map('trim', explode(',', $status)));
            }
            if (!is_array($status) || empty($status)) {
                $status = function_exists('wc_get_order_statuses')
                    ? array_map(
                        function ($k) { return (strpos($k, 'wc-') === 0) ? substr($k, 3) : $k; },
                        array_keys(wc_get_order_statuses())
                    )
                    : ['completed', 'processing', 'on-hold', 'pending', 'cancelled', 'refunded', 'failed'];
            }

            // payment_method: מחרוזת/CSV או מערך
            $payment_method = $request->get_param('payment_method');
            if (is_string($payment_method)) {
                $payment_method = array_filter(array_map('trim', explode(',', $payment_method)));
            }
            if (!is_array($payment_method) || empty($payment_method)) {
                $payment_method = null;
            }

            $customer_email = $request->get_param('customer_email');
            $min_total = $request->get_param('min_total');
            $max_total = $request->get_param('max_total');

            // filters: JSON או אובייקט
            $filters_json = $request->get_param('filters');
            $filters = [];
            if ($filters_json) {
                if (is_string($filters_json)) {
                    $decoded = json_decode(stripslashes($filters_json), true);
                    if (is_array($decoded))
                        $filters = $decoded;
                } elseif (is_array($filters_json)) {
                    $filters = $filters_json;
                }
            }

            $orders_handler = new WhizManage_Orders();

            $out = $orders_handler->get_orders([
                'page' => $page,
                'per_page' => $per_page,
                'status' => $status,
                // ✅ מעבירים בפרמטרים שה־WhizManage_Orders מצפה להם
                'date_from' => $start_date,
                'date_to' => $end_date,
                'payment_method' => $payment_method,
                'customer_email' => $customer_email,
                'min_total' => $min_total,
                'max_total' => $max_total,
                'search' => $search,
                'filters' => $filters,
                'paginate' => true,
            ]);

            return rest_ensure_response($out);
        }

        public function check_coupons($request)
        {
            // פילטרים למתירנות מקסימלית
            $allow = '__return_true';
            add_filter('woocommerce_product_is_in_stock', $allow);
            add_filter('woocommerce_prevent_user_from_purchasing_out_of_stock_items', '__return_false');
            add_filter('woocommerce_product_is_purchasable', $allow);
            add_filter('woocommerce_variation_is_purchasable', $allow);
            add_filter('woocommerce_product_is_visible', $allow);

            try {
                if (null === WC()->session) {
                    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WooCommerce core hook
                    $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
                    WC()->session = new $session_class();
                    WC()->session->init();
                }

                if (null === WC()->customer) {
                    WC()->customer = new WC_Customer(get_current_user_id(), true);
                }


                // הגדרת לקוח
                $customer_email = $request->get_param("customer_email");
                if (!empty($customer_email) && is_email($customer_email)) {
                    WC()->customer->set_billing_email($customer_email);
                    WC()->customer->set_email($customer_email);
                }
                if (!WC()->customer->get_billing_country()) {
                    $default_country = get_option('woocommerce_default_country');
                    if ($default_country) {
                        $base_location = wc_get_base_location();
                        WC()->customer->set_billing_country($base_location['country']);
                        WC()->customer->set_shipping_country($base_location['country']);
                        WC()->customer->set_billing_state($base_location['state']);
                        WC()->customer->set_billing_postcode('');
                    }
                }
                WC()->customer->save();

                WC()->cart = new WC_Cart();
                WC()->cart->empty_cart();

                $coupon_codes = $request->get_param('coupons') ?: [];
                $line_items = $request->get_param('line_items') ?: [];
                $debug_log = [];

                // מציאת "מוצר ממלא מקום" (Proxy) למקרה של מוצרים מחוקים
                // אנחנו מנסים למצוא ID של מוצר אמיתי כלשהו בחנות
                $proxy_product_id = 0;
                $possible_proxies = wc_get_products(['limit' => 1, 'status' => 'publish', 'return' => 'ids']);
                if (!empty($possible_proxies)) {
                    $proxy_product_id = reset($possible_proxies);
                }

                // הוק כפיית מחיר
                $force_price_callback = function ($cart) {
                    foreach ($cart->get_cart() as $item) {
                        if (isset($item['simulated_price']) && is_numeric($item['simulated_price'])) {
                            $item['data']->set_price((float) $item['simulated_price']);
                        }
                    }
                };
                add_action('woocommerce_before_calculate_totals', $force_price_callback, 9999);

                if (is_array($line_items)) {
                    foreach ($line_items as $index => $item) {
                        $pid = intval($item['product_id'] ?? 0);
                        $vid = intval($item['variation_id'] ?? 0);
                        $qty = max(1, intval($item['quantity'] ?? 1));
                        $price = isset($item['price']) && is_numeric($item['price']) ? (float) $item['price'] : 0;

                        if ($pid <= 0 && $price <= 0) {
                            continue; // דלג רק אם גם ה-ID לא תקין וגם אין מחיר
                        }

                        // ניסיון 1: הוספה רגילה
                        $added = false;
                        if ($pid > 0) {
                            $added = WC()->cart->add_to_cart($pid, $qty, $vid ?: 0, [], ['simulated_price' => $price]);
                        }

                        // ניסיון 2: אם נכשל (אולי מוצר מחוק?), נשתמש בממלא מקום אם קיים
                        if (!$added && $proxy_product_id > 0) {
                            // מוסיפים את המוצר הממלא מקום, אבל עם המחיר המקורי של המוצר שנמחק
                            $added = WC()->cart->add_to_cart($proxy_product_id, $qty, 0, [], ['simulated_price' => $price]);
                            if ($added) {
                                $debug_log[] = "Item #$index (Orig ID $pid): Deleted/Invalid. Used proxy product #$proxy_product_id with price $price.";
                            }
                        }

                        if (!$added) {
                            $debug_log[] = "Item #$index (ID $pid): Completely failed to add to simulated cart.";
                        }
                    }
                }

                foreach ($coupon_codes as $code) {
                    WC()->cart->apply_coupon(sanitize_text_field($code));
                }
                WC()->cart->calculate_totals();

                $applied = [];
                $applied_codes = [];
                foreach (WC()->cart->get_applied_coupons() as $code) {
                    $c = new WC_Coupon($code);
                    $applied[] = [
                        'code' => $code,
                        'valid' => true,
                        'id' => $c->get_id(),
                        'discount' => wc_format_decimal(WC()->cart->get_coupon_discount_amount($code, true), 2)
                    ];
                    $applied_codes[] = strtolower($code);
                }

                // ✅ בדיקה: האם כל הקופונים שהתבקשו הוחלו בהצלחה?
                $failed_coupons = [];
                foreach ($coupon_codes as $requested_code) {
                    $normalized_code = strtolower(sanitize_text_field($requested_code));
                    if (!in_array($normalized_code, $applied_codes)) {
                        $failed_coupons[] = $requested_code;
                    }
                }

                // אם יש קופונים שנכשלו, החזר success: false
                if (!empty($failed_coupons)) {
                    $response = [
                        'success' => false,
                        'message' => 'Coupon not found or invalid: ' . implode(', ', $failed_coupons),
                        'failed_coupons' => $failed_coupons,
                        'coupons' => $applied, // עדיין מחזיר את הקופונים שכן הוחלו
                        'subtotal' => wc_format_decimal(WC()->cart->get_subtotal(), 2),
                        'discount_total' => wc_format_decimal(WC()->cart->get_discount_total(), 2),
                        'total' => wc_format_decimal(WC()->cart->get_total(''), 2),
                        'debug' => $debug_log
                    ];
                } else {
                    $response = [
                        'success' => true,
                        'coupons' => $applied,
                        'subtotal' => wc_format_decimal(WC()->cart->get_subtotal(), 2),
                        'discount_total' => wc_format_decimal(WC()->cart->get_discount_total(), 2),
                        'total' => wc_format_decimal(WC()->cart->get_total(''), 2),
                        'debug' => $debug_log
                    ];
                }

                remove_action('woocommerce_before_calculate_totals', $force_price_callback, 9999);
                remove_filter('woocommerce_product_is_in_stock', $allow);
                remove_filter('woocommerce_product_is_purchasable', $allow);
                remove_filter('woocommerce_variation_is_purchasable', $allow);
                remove_filter('woocommerce_product_is_visible', $allow);
                WC()->cart->empty_cart();

                return new WP_REST_Response($response, 200);
            } catch (Exception $e) {
                return new WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 500);
            }
        }

        public function handle_add_order_note($request)
        {
            $orders = $request->get_param('orders');
            $include_notes = $request->get_param('include_notes');
            $results = [];

            foreach ($orders as $data) {
                $order = wc_get_order($data['order_id']);
                if (!$order) {
                    $results[] = ['order_id' => $data['order_id'], 'success' => false, 'error' => 'Order not found'];
                    continue;
                }

                if (!empty($data['private_note'])) {
                    $order->add_order_note(sanitize_text_field($data['private_note']), false);
                }
                if (!empty($data['customer_note'])) {
                    $order->add_order_note(sanitize_text_field($data['customer_note']), true);
                }

                $notes = [];
                if ($include_notes) {
                    foreach (wc_get_order_notes(['order_id' => $data['order_id']]) as $note) {
                        $notes[] = [
                            'id' => $note->id,
                            'content' => $note->content,
                            'date' => $note->date_created->date('Y-m-d H:i:s'),
                            'added_by' => $note->added_by,
                            'customer_note' => (bool) $note->customer_note,
                        ];
                    }
                }

                $results[] = ['order_id' => $data['order_id'], 'success' => true, 'notes' => $notes];
            }

            return ['success' => true, 'results' => $results];
        }

        public function handle_delete_order_note($request)
        {
            $note_id = intval($request['note_id']);

            global $wpdb;
            $deleted = $wpdb->delete(
                $wpdb->prefix . 'comments',
                ['comment_ID' => $note_id],
                ['%d']
            );

            if ($deleted) {
                return [
                    'success' => true,
                    'message' => 'Note deleted successfully',
                ];
            } else {
                return new WP_Error('note_not_deleted', 'Could not delete note', ['status' => 400]);
            }
        }

        private function get_coupon_error_message($coupon)
        {
            // --- תיקון: השתמש ב-get_id() במקום ב-exists() ---
            if (!$coupon || $coupon->get_id() === 0) {
                return 'Coupon does not exist';
            }
            // --- סוף תיקון ---

            if ($coupon->get_usage_limit() > 0 && $coupon->get_usage_count() >= $coupon->get_usage_limit()) {
                return 'Coupon usage limit exceeded';
            }

            $expiry_date = $coupon->get_date_expires();
            if ($expiry_date && $expiry_date->getTimestamp() < time()) {
                return 'Coupon has expired';
            }

            // --- הוספת בדיקת אימייל (עם תיקון case-insensitive) ---
            $customer_email = WC()->customer ? WC()->customer->get_email() : '';
            if ($customer_email && !empty($coupon->get_email_restrictions())) {
                $allowed_emails = array_map('strtolower', $coupon->get_email_restrictions());
                if (!in_array(strtolower($customer_email), $allowed_emails)) {
                    return 'Coupon is not valid for this email address';
                }
            }

            return 'Coupon is not valid'; // הודעת ברירת מחדל אם שום דבר אחר לא נתפס
        }

        public function check_permissions()
        {

            // בדיקה אם המשתמש הנוכחי הוא מנהל אתר או מנהל חנות
            if (current_user_can('manage_options') || current_user_can('manage_woocommerce') || current_user_can('use_whizmanage')) {
                return true;
            }

            // אם המשתמש לא עומד בתנאים, החזרת שגיאה
            return new WP_Error(
                'rest_forbidden',
                esc_html__('You do not have permissions to access this.', 'whizmanage'),
                array('status' => 403)
            );
        }
    }
}
