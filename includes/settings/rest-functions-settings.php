<?php
/**
 * Settings REST API endpoints for WhizManage Pro
 *
 * @package WhizManage_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!class_exists('Whizmanage_rest_functions_settings')) {

    class Whizmanage_rest_functions_settings
    {
        /**
         * WooCommerce options that can be managed
         */
        private $woo_options = array(
            // General Store
            'woocommerce_store_address',
            'woocommerce_store_address_2',
            'woocommerce_store_city',
            'woocommerce_store_postcode',
            'woocommerce_default_country',
            'woocommerce_enable_coupons',
            // Currency
            'woocommerce_currency',
            'woocommerce_currency_pos',
            'woocommerce_price_thousand_sep',
            'woocommerce_price_decimal_sep',
            'woocommerce_price_num_decimals',
            // Units
            'woocommerce_weight_unit',
            'woocommerce_dimension_unit',
            // Tax
            'woocommerce_calc_taxes',
            'woocommerce_prices_include_tax',
            'woocommerce_tax_display_shop',
            'woocommerce_tax_display_cart',
            // Inventory
            'woocommerce_manage_stock',
            'woocommerce_hold_stock_minutes',
            'woocommerce_notify_low_stock',
            'woocommerce_notify_no_stock',
            'woocommerce_stock_email_recipient',
            'woocommerce_low_stock_amount',
            'woocommerce_notify_low_stock_amount',
            'woocommerce_hide_out_of_stock_items',
            // Products Display
            'woocommerce_catalog_columns',
            'woocommerce_catalog_rows',
            'woocommerce_default_catalog_orderby',
            // Checkout
            'woocommerce_enable_guest_checkout',
            'woocommerce_enable_checkout_login_reminder',
            'woocommerce_enable_signup_and_login_from_checkout',
        );

        /**
         * WordPress core options
         */
        private $wp_options = array(
            'WPLANG',
            'blogname',
            'blogdescription',
            'siteurl',
            'home',
            'admin_email',
            'users_can_register',
            'default_role',
            'timezone_string',
            'gmt_offset',
            'date_format',
            'time_format',
            'start_of_week',
            'site_icon',
        );

        /**
         * WhizManage specific options
         */
        private $whizmanage_options = array(
            'whizmanage_default_rows_per_page',
            'whizmanage_enable_history',
            'whizmanage_history_retention_days',
            'whizmanage_hidden_fields',
            'whizmanage_hidden_custom_fields',
        );

        /**
         * Default values for WhizManage options
         */
        private $whizmanage_defaults = array(
            'whizmanage_default_rows_per_page' => 100,
            'whizmanage_enable_history' => 'yes',
            'whizmanage_history_retention_days' => 30,
            'whizmanage_hidden_fields' => '{}',
            'whizmanage_hidden_custom_fields' => '[]',
        );

        /**
         * Constructor
         */
        public function __construct()
        {
            add_action('rest_api_init', array($this, 'register_routes'));
        }

        /**
         * Register REST API routes
         */
        public function register_routes()
        {
            // GET all settings
            register_rest_route('whizmanage/v1', '/settings', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_settings'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update settings
            register_rest_route('whizmanage/v1', '/settings', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_settings'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET available currencies
            register_rest_route('whizmanage/v1', '/settings/currencies', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_currencies'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET countries list
            register_rest_route('whizmanage/v1', '/settings/countries', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_countries'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET available languages
            register_rest_route('whizmanage/v1', '/settings/languages', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_languages'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET current user info
            register_rest_route('whizmanage/v1', '/settings/user', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_user_info'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // PUT update user info
            register_rest_route('whizmanage/v1', '/settings/user', array(
                'methods'             => 'PUT',
                'callback'            => array($this, 'update_user_info'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET timezones list
            register_rest_route('whizmanage/v1', '/settings/timezones', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_timezones'),
                'permission_callback' => array($this, 'permissions_check'),
            ));

            // GET user roles list
            register_rest_route('whizmanage/v1', '/settings/roles', array(
                'methods'             => 'GET',
                'callback'            => array($this, 'get_roles'),
                'permission_callback' => array($this, 'permissions_check'),
            ));
        }

        /**
         * GET: Retrieve all settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_settings(WP_REST_Request $request)
        {
            $settings = array();

            // Get WooCommerce options
            foreach ($this->woo_options as $option) {
                $settings[$option] = get_option($option, '');
            }

            // Get WordPress core options
            foreach ($this->wp_options as $option) {
                $settings[$option] = get_option($option, '');
            }

            // Get WhizManage options with defaults
            foreach ($this->whizmanage_options as $option) {
                $default = isset($this->whizmanage_defaults[$option])
                    ? $this->whizmanage_defaults[$option]
                    : '';
                $settings[$option] = get_option($option, $default);
            }

            // Add useful metadata
            $settings['_meta'] = array(
                'currency_symbol' => function_exists('get_woocommerce_currency_symbol')
                    ? get_woocommerce_currency_symbol()
                    : '$',
                'store_name'      => get_bloginfo('name'),
                'woocommerce_active' => class_exists('WooCommerce'),
            );

            return rest_ensure_response($settings);
        }

        /**
         * PUT: Update settings
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_settings(WP_REST_Request $request)
        {
            $params  = $request->get_json_params();
            $updated = array();
            $errors  = array();

            // Combine all supported options
            $all_options = array_merge($this->woo_options, $this->wp_options, $this->whizmanage_options);

            foreach ($params as $key => $value) {
                // Skip metadata
                if (strpos($key, '_') === 0) {
                    continue;
                }

                // Verify option is supported
                if (!in_array($key, $all_options, true)) {
                    $errors[] = sprintf('Unsupported option: %s', $key);
                    continue;
                }

                // Sanitize based on type
                $sanitized = $this->sanitize_option($key, $value);

                // Update option
                update_option($key, $sanitized);
                $updated[$key] = $sanitized;
            }

            // Clear WooCommerce caches
            $this->clear_woo_caches();

            return rest_ensure_response(array(
                'success' => empty($errors),
                'updated' => $updated,
                'errors'  => $errors,
            ));
        }

        /**
         * Sanitize option value based on option type
         *
         * @param string $key   Option key.
         * @param mixed  $value Option value.
         * @return mixed Sanitized value.
         */
        private function sanitize_option($key, $value)
        {
            switch ($key) {
                // Integer values
                case 'woocommerce_price_num_decimals':
                    return absint($value);

                case 'whizmanage_default_rows_per_page':
                    $val = absint($value);
                    return max(10, min(500, $val)); // Between 10-500

                case 'whizmanage_history_retention_days':
                    $val = absint($value);
                    return max(1, min(365, $val)); // Between 1-365

                // JSON values (hidden fields configuration)
                case 'whizmanage_hidden_fields':
                    // Validate it's valid JSON
                    if (is_string($value)) {
                        $decoded = json_decode($value, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            // Sanitize the keys and values
                            $sanitized = array();
                            $allowed_entities = array('products', 'coupons', 'orders', 'customers', 'discount_rules');
                            foreach ($decoded as $entity => $fields) {
                                if (in_array($entity, $allowed_entities, true) && is_array($fields)) {
                                    $sanitized[$entity] = array_map('sanitize_text_field', $fields);
                                }
                            }
                            return wp_json_encode($sanitized);
                        }
                    }
                    return '{}'; // Default to empty object

                // JSON array (hidden custom fields)
                case 'whizmanage_hidden_custom_fields':
                    // Validate it's valid JSON array
                    if (is_string($value)) {
                        $decoded = json_decode($value, true);
                        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                            // Sanitize field keys
                            $sanitized = array_map('sanitize_text_field', $decoded);
                            return wp_json_encode(array_values($sanitized));
                        }
                    }
                    return '[]'; // Default to empty array

                // Yes/No values
                case 'woocommerce_enable_coupons':
                case 'woocommerce_calc_taxes':
                case 'woocommerce_prices_include_tax':
                case 'whizmanage_enable_history':
                case 'woocommerce_manage_stock':
                case 'woocommerce_notify_low_stock':
                case 'woocommerce_notify_no_stock':
                case 'woocommerce_hide_out_of_stock_items':
                case 'woocommerce_enable_guest_checkout':
                case 'woocommerce_enable_checkout_login_reminder':
                case 'woocommerce_enable_signup_and_login_from_checkout':
                    return ($value === 'yes' || $value === true || $value === '1') ? 'yes' : 'no';

                // Currency position
                case 'woocommerce_currency_pos':
                    $allowed = array('left', 'right', 'left_space', 'right_space');
                    return in_array($value, $allowed, true) ? $value : 'left';

                // Weight unit
                case 'woocommerce_weight_unit':
                    $allowed = array('kg', 'g', 'lbs', 'oz');
                    return in_array($value, $allowed, true) ? $value : 'kg';

                // Dimension unit
                case 'woocommerce_dimension_unit':
                    $allowed = array('m', 'cm', 'mm', 'in', 'yd');
                    return in_array($value, $allowed, true) ? $value : 'cm';

                // Tax display
                case 'woocommerce_tax_display_shop':
                case 'woocommerce_tax_display_cart':
                    return ($value === 'incl') ? 'incl' : 'excl';

                // Currency code (3 letter uppercase)
                case 'woocommerce_currency':
                    return strtoupper(sanitize_text_field($value));

                // WordPress: Boolean 0/1 values
                case 'users_can_register':
                    return ($value === '1' || $value === true || $value === 1) ? '1' : '0';

                // WordPress: Start of week (0-6)
                case 'start_of_week':
                    $val = absint($value);
                    return min(6, $val);

                // WordPress: Number of decimals for prices
                case 'woocommerce_price_num_decimals':
                    return absint($value);

                // WordPress: GMT offset (can be decimal like 5.5)
                case 'gmt_offset':
                    return floatval($value);

                // WordPress: Site icon (attachment ID)
                case 'site_icon':
                    return absint($value);

                // WordPress: Email validation
                case 'admin_email':
                    return sanitize_email($value);

                // WordPress: URLs
                case 'siteurl':
                case 'home':
                    return esc_url_raw($value);

                // WordPress: Role (must exist)
                case 'default_role':
                    global $wp_roles;
                    if (!isset($wp_roles)) {
                        $wp_roles = new WP_Roles();
                    }
                    $roles = array_keys($wp_roles->get_names());
                    return in_array($value, $roles, true) ? $value : 'subscriber';

                // Inventory: Integer values
                case 'woocommerce_hold_stock_minutes':
                    $val = absint($value);
                    return max(0, min(1440, $val)); // 0 to 1440 minutes (24 hours)

                case 'woocommerce_low_stock_amount':
                case 'woocommerce_notify_low_stock_amount':
                    return absint($value);

                // Inventory: Email
                case 'woocommerce_stock_email_recipient':
                    return sanitize_email($value);

                // Products Display: Integer values
                case 'woocommerce_catalog_columns':
                    $val = absint($value);
                    return max(1, min(6, $val)); // 1 to 6 columns

                case 'woocommerce_catalog_rows':
                    $val = absint($value);
                    return max(1, min(10, $val)); // 1 to 10 rows

                // Products Display: Catalog orderby
                case 'woocommerce_default_catalog_orderby':
                    $allowed = array('menu_order', 'popularity', 'rating', 'date', 'price', 'price-desc');
                    return in_array($value, $allowed, true) ? $value : 'menu_order';

                // Default text sanitization
                default:
                    return sanitize_text_field($value);
            }
        }

        /**
         * Clear WooCommerce caches after settings update
         */
        private function clear_woo_caches()
        {
            if (function_exists('wc_delete_product_transients')) {
                wc_delete_product_transients();
            }

            if (function_exists('WC') && WC()->cart) {
                WC()->cart->calculate_totals();
            }

            // Clear any cached currency data
            delete_transient('wc_currency_symbols');
        }

        /**
         * GET: Available currencies
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_currencies(WP_REST_Request $request)
        {
            if (!function_exists('get_woocommerce_currencies')) {
                return rest_ensure_response(array());
            }

            $currencies = get_woocommerce_currencies();
            $result     = array();

            foreach ($currencies as $code => $name) {
                $result[] = array(
                    'code'   => $code,
                    'name'   => $name,
                    'symbol' => get_woocommerce_currency_symbol($code),
                );
            }

            return rest_ensure_response($result);
        }

        /**
         * GET: Countries list
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_countries(WP_REST_Request $request)
        {
            if (!function_exists('WC') || !WC()->countries) {
                return rest_ensure_response(array());
            }

            $countries = WC()->countries->get_countries();
            $states    = WC()->countries->get_states();
            $result    = array();

            foreach ($countries as $code => $name) {
                $country_data = array(
                    'code' => $code,
                    'name' => $name,
                );

                // Add states if available
                if (isset($states[$code]) && !empty($states[$code])) {
                    $country_data['states'] = array();
                    foreach ($states[$code] as $state_code => $state_name) {
                        $country_data['states'][] = array(
                            'code' => $state_code,
                            'name' => $state_name,
                        );
                    }
                }

                $result[] = $country_data;
            }

            return rest_ensure_response($result);
        }

        /**
         * GET: Available languages
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_languages(WP_REST_Request $request)
        {
            require_once ABSPATH . 'wp-admin/includes/translation-install.php';

            $translations = wp_get_available_translations();
            $result = array();

            // Add English (US) as default
            $result[] = array(
                'locale'      => 'en_US',
                'name'        => 'English (United States)',
                'native_name' => 'English (United States)',
            );

            foreach ($translations as $locale => $data) {
                $result[] = array(
                    'locale'      => $locale,
                    'name'        => isset($data['english_name']) ? $data['english_name'] : $locale,
                    'native_name' => isset($data['native_name']) ? $data['native_name'] : $locale,
                );
            }

            // Sort by native name
            usort($result, function ($a, $b) {
                return strcmp($a['native_name'], $b['native_name']);
            });

            return rest_ensure_response($result);
        }

        /**
         * GET: Current user info
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_user_info(WP_REST_Request $request)
        {
            $current_user = wp_get_current_user();

            // Get store owner info (admin user with ID 1 or first admin)
            $store_owner = get_user_by('id', 1);
            if (!$store_owner || !in_array('administrator', $store_owner->roles)) {
                $admins = get_users(array('role' => 'administrator', 'number' => 1));
                $store_owner = !empty($admins) ? $admins[0] : $current_user;
            }

            // Get Gravatar profile URL for current user
            $gravatar_hash = md5(strtolower(trim($current_user->user_email)));
            $gravatar_profile_url = 'https://gravatar.com/' . $gravatar_hash;
            $gravatar_edit_url = 'https://gravatar.com/profile';

            $result = array(
                'current_user' => array(
                    'id'                   => $current_user->ID,
                    'username'             => $current_user->user_login,
                    'email'                => $current_user->user_email,
                    'display_name'         => $current_user->display_name,
                    'first_name'           => $current_user->first_name,
                    'last_name'            => $current_user->last_name,
                    'nickname'             => $current_user->nickname,
                    'description'          => $current_user->description,
                    'user_url'             => $current_user->user_url,
                    'avatar_url'           => get_avatar_url($current_user->ID, array('size' => 150)),
                    'gravatar_profile_url' => $gravatar_profile_url,
                    'gravatar_edit_url'    => $gravatar_edit_url,
                    'roles'                => $current_user->roles,
                    'registered'           => $current_user->user_registered,
                ),
                'store_owner' => array(
                    'id'           => $store_owner->ID,
                    'username'     => $store_owner->user_login,
                    'email'        => $store_owner->user_email,
                    'display_name' => $store_owner->display_name,
                    'first_name'   => $store_owner->first_name,
                    'last_name'    => $store_owner->last_name,
                    'avatar_url'   => get_avatar_url($store_owner->ID, array('size' => 96)),
                ),
            );

            // Add billing and shipping addresses if WooCommerce is active
            if (function_exists('WC')) {
                $result['billing'] = array(
                    'first_name' => get_user_meta($current_user->ID, 'billing_first_name', true),
                    'last_name'  => get_user_meta($current_user->ID, 'billing_last_name', true),
                    'company'    => get_user_meta($current_user->ID, 'billing_company', true),
                    'address_1'  => get_user_meta($current_user->ID, 'billing_address_1', true),
                    'address_2'  => get_user_meta($current_user->ID, 'billing_address_2', true),
                    'city'       => get_user_meta($current_user->ID, 'billing_city', true),
                    'postcode'   => get_user_meta($current_user->ID, 'billing_postcode', true),
                    'state'      => get_user_meta($current_user->ID, 'billing_state', true),
                    'country'    => get_user_meta($current_user->ID, 'billing_country', true),
                    'phone'      => get_user_meta($current_user->ID, 'billing_phone', true),
                    'email'      => get_user_meta($current_user->ID, 'billing_email', true),
                );
                $result['shipping'] = array(
                    'first_name' => get_user_meta($current_user->ID, 'shipping_first_name', true),
                    'last_name'  => get_user_meta($current_user->ID, 'shipping_last_name', true),
                    'company'    => get_user_meta($current_user->ID, 'shipping_company', true),
                    'address_1'  => get_user_meta($current_user->ID, 'shipping_address_1', true),
                    'address_2'  => get_user_meta($current_user->ID, 'shipping_address_2', true),
                    'city'       => get_user_meta($current_user->ID, 'shipping_city', true),
                    'postcode'   => get_user_meta($current_user->ID, 'shipping_postcode', true),
                    'state'      => get_user_meta($current_user->ID, 'shipping_state', true),
                    'country'    => get_user_meta($current_user->ID, 'shipping_country', true),
                    'phone'      => get_user_meta($current_user->ID, 'shipping_phone', true),
                );
            }

            // Add WooCommerce store info if available
            if (function_exists('WC')) {
                $result['store_info'] = array(
                    'store_name'  => get_bloginfo('name'),
                    'store_email' => get_option('woocommerce_email_from_address', get_option('admin_email')),
                    'store_phone' => get_option('woocommerce_store_phone', ''),
                );
            }

            return rest_ensure_response($result);
        }

        /**
         * PUT: Update user info
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function update_user_info(WP_REST_Request $request)
        {
            $params = $request->get_json_params();
            $current_user = wp_get_current_user();
            $errors = array();
            $updated = array();

            // Update current user fields
            if (isset($params['current_user'])) {
                $user_data = $params['current_user'];
                $update_args = array('ID' => $current_user->ID);

                if (isset($user_data['first_name'])) {
                    $update_args['first_name'] = sanitize_text_field($user_data['first_name']);
                }
                if (isset($user_data['last_name'])) {
                    $update_args['last_name'] = sanitize_text_field($user_data['last_name']);
                }
                if (isset($user_data['display_name'])) {
                    $update_args['display_name'] = sanitize_text_field($user_data['display_name']);
                }
                if (isset($user_data['nickname'])) {
                    $update_args['nickname'] = sanitize_text_field($user_data['nickname']);
                }
                if (isset($user_data['email']) && is_email($user_data['email'])) {
                    $update_args['user_email'] = sanitize_email($user_data['email']);
                }
                if (isset($user_data['description'])) {
                    $update_args['description'] = sanitize_textarea_field($user_data['description']);
                }
                if (isset($user_data['user_url'])) {
                    $update_args['user_url'] = esc_url_raw($user_data['user_url']);
                }

                if (count($update_args) > 1) {
                    $result = wp_update_user($update_args);
                    if (is_wp_error($result)) {
                        $errors[] = $result->get_error_message();
                    } else {
                        $updated['current_user'] = $update_args;
                    }
                }
            }

            // Update billing address
            if (isset($params['billing']) && function_exists('WC')) {
                $billing_fields = array(
                    'first_name', 'last_name', 'company', 'address_1', 'address_2',
                    'city', 'postcode', 'state', 'country', 'phone', 'email'
                );
                foreach ($billing_fields as $field) {
                    if (isset($params['billing'][$field])) {
                        $value = $field === 'email'
                            ? sanitize_email($params['billing'][$field])
                            : sanitize_text_field($params['billing'][$field]);
                        update_user_meta($current_user->ID, 'billing_' . $field, $value);
                        $updated['billing'][$field] = $value;
                    }
                }
            }

            // Update shipping address
            if (isset($params['shipping']) && function_exists('WC')) {
                $shipping_fields = array(
                    'first_name', 'last_name', 'company', 'address_1', 'address_2',
                    'city', 'postcode', 'state', 'country', 'phone'
                );
                foreach ($shipping_fields as $field) {
                    if (isset($params['shipping'][$field])) {
                        $value = sanitize_text_field($params['shipping'][$field]);
                        update_user_meta($current_user->ID, 'shipping_' . $field, $value);
                        $updated['shipping'][$field] = $value;
                    }
                }
            }

            // Update store info (requires manage_woocommerce or manage_options)
            if (isset($params['store_info']) && (current_user_can('manage_options') || current_user_can('manage_woocommerce'))) {
                $store_data = $params['store_info'];

                if (isset($store_data['store_name'])) {
                    update_option('blogname', sanitize_text_field($store_data['store_name']));
                    $updated['store_name'] = $store_data['store_name'];
                }
                if (isset($store_data['store_email']) && is_email($store_data['store_email'])) {
                    update_option('woocommerce_email_from_address', sanitize_email($store_data['store_email']));
                    $updated['store_email'] = $store_data['store_email'];
                }
                if (isset($store_data['store_phone'])) {
                    update_option('woocommerce_store_phone', sanitize_text_field($store_data['store_phone']));
                    $updated['store_phone'] = $store_data['store_phone'];
                }
            }

            return rest_ensure_response(array(
                'success' => empty($errors),
                'updated' => $updated,
                'errors'  => $errors,
            ));
        }

        /**
         * GET: Available timezones
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_timezones(WP_REST_Request $request)
        {
            $result = array();

            // Add UTC offsets
            $offset_range = array(
                -12, -11.5, -11, -10.5, -10, -9.5, -9, -8.5, -8, -7.5, -7, -6.5, -6, -5.5, -5, -4.5, -4, -3.5, -3, -2.5, -2, -1.5, -1, -0.5,
                0,
                0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 7.5, 8, 8.5, 8.75, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.75, 13, 13.75, 14
            );

            foreach ($offset_range as $offset) {
                if ($offset === 0) {
                    $label = 'UTC';
                    $value = 'UTC';
                } else {
                    $sign = ($offset >= 0) ? '+' : '';
                    $hours = (int) $offset;
                    $mins = ($offset - $hours) * 60;
                    $mins_str = ($mins != 0) ? ':' . sprintf('%02d', abs($mins)) : '';
                    $label = 'UTC' . $sign . $hours . $mins_str;
                    $value = (string) $offset;
                }

                $result[] = array(
                    'value' => $value,
                    'label' => $label,
                    'type'  => 'offset',
                );
            }

            // Add timezone strings grouped by continent
            $continents = array(
                'Africa',
                'America',
                'Antarctica',
                'Arctic',
                'Asia',
                'Atlantic',
                'Australia',
                'Europe',
                'Indian',
                'Pacific',
            );

            $timezones = timezone_identifiers_list();

            foreach ($continents as $continent) {
                foreach ($timezones as $tz) {
                    if (strpos($tz, $continent . '/') === 0) {
                        $city = str_replace('_', ' ', substr($tz, strlen($continent) + 1));
                        $city = str_replace('/', ' - ', $city);
                        $result[] = array(
                            'value' => $tz,
                            'label' => $continent . '/' . $city,
                            'type'  => 'timezone',
                        );
                    }
                }
            }

            return rest_ensure_response($result);
        }

        /**
         * GET: User roles
         *
         * @param WP_REST_Request $request Request object.
         * @return WP_REST_Response
         */
        public function get_roles(WP_REST_Request $request)
        {
            global $wp_roles;

            if (!isset($wp_roles)) {
                $wp_roles = new WP_Roles();
            }

            $roles = $wp_roles->get_names();
            $result = array();

            foreach ($roles as $role_id => $role_name) {
                $result[] = array(
                    'id'   => $role_id,
                    'name' => translate_user_role($role_name),
                );
            }

            return rest_ensure_response($result);
        }

        /**
         * Check permissions for settings management
         *
         * @return bool|WP_Error
         */
        public function permissions_check()
        {
            if (current_user_can('manage_options') || current_user_can('manage_woocommerce')|| current_user_can('use_whizmanage')) {
                return true;
            }

            return new WP_Error(
                'rest_forbidden',
                esc_html__('You do not have permissions to manage settings.', 'whizmanage'),
                array('status' => 403)
            );
        }
    }
}
