<?php
require_once WHIZMANAGE_DIR . 'includes/customers/get-customers.php';

if (!class_exists('Whizmanage_rest_functions_customers')) {

    class Whizmanage_rest_functions_customers
    {

        public function __construct()
        {
            add_action('rest_api_init', [$this, 'register_api_endpoints']);
        }

        public function register_api_endpoints()
        {
            register_rest_route(
                'whizmanage/v1',
                '/get_customers/',
                [
                    'methods' => 'GET',
                    'callback' => [$this, 'get_customers_endpoint'],
                    'permission_callback' => [$this, 'check_permissions'],
                ]
            );
        }

        public function get_customers_endpoint(WP_REST_Request $request)
        {
            $page = max(1, intval($request->get_param('page') ?: 1));
            $per_page_raw = $request->get_param('per_page');
            $per_page = ($per_page_raw === null) ? 100 : max(1, min(200, intval($per_page_raw)));

            $search = $request->get_param('search') ?: null;

            // ---- תפקיד יחיד בלבד ----
            $role_in = $request->get_param('role');
            $role = is_string($role_in) && $role_in !== '' ? strtolower(trim($role_in)) : 'customer';
            if ($role !== 'customer') {
                $role = 'customer';
            }

            // תמיכה ב-is_paying_customer
            $ipc_raw = $request->get_param('is_paying_customer');
            $is_paying_customer = null;
            if ($ipc_raw !== null && $ipc_raw !== '') {
                $val = strtolower((string) $ipc_raw);
                if (in_array($val, ['1', 'true', 'yes'], true)) {
                    $is_paying_customer = true;
                } elseif (in_array($val, ['0', 'false', 'no'], true)) {
                    $is_paying_customer = false;
                }
            }

            // include_orders - האם לכלול הזמנות מלאות
            $include_orders = !empty($request->get_param('include_orders'));

            $handler = new WhizManage_Customers();

            $out = $handler->get_customers([
                'page' => $page,
                'per_page' => $per_page,
                'search' => $search,
                'role' => $role,
                'is_paying_customer' => $is_paying_customer,
                'include_orders' => $include_orders,
            ]);

            return rest_ensure_response($out);
        }

        public function check_permissions()
        {
            if (current_user_can('manage_options') || current_user_can('manage_woocommerce')) {
                return true;
            }

            return new WP_Error(
                'rest_forbidden',
                esc_html__('You do not have permissions to access this.', 'whizmanage'),
                ['status' => 403]
            );
        }
    }
}
