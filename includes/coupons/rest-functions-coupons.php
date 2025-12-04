<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

require_once WHIZMANAGE_DIR . 'includes/coupons/get-coupons.php';


if (!class_exists('Whizmanage_rest_functions_coupons')) {

    class Whizmanage_rest_functions_coupons
    {
        public function __construct()
        {
            add_action('rest_api_init', array($this, 'whizmanage_register_rest_route_coupons'));
        }

        /**
         * עדכון השדה 'status' של הקופון דרך REST API.
         *
         * @param WC_Coupon $coupon אובייקט הקופון.
         * @param WP_REST_Request $request הבקשה מה-API.
         * @param bool $creating האם מדובר ביצירה של קופון חדש.
         */

        public function whizmanage_register_rest_route_coupons()
        {
            register_rest_route('whizmanage/v1', '/get_coupons/', array(
                'methods'  => 'GET',
                'callback' => array($this, 'get_all_coupons_endpoint'),
                'permission_callback' => array($this, 'permissions_check')
            ));
            register_rest_route('whizmanage/v1', '/toggle-coupons', array(
                'methods' => 'POST',
                'callback' => array($this, 'toggle_coupons'),
                'permission_callback' => array($this, 'permissions_check')
            ));
            register_rest_route('whizmanage/v1', '/check-coupons-status', array(
                'methods' => 'GET',
                'callback' => array($this, 'check_coupons_status'),
                'permission_callback' => array($this, 'permissions_check')
            ));
        }

        public function get_all_coupons_endpoint()
        {
            $coupons_controller = new Whizmanage_coupons_controller();
            $coupons = $coupons_controller->get_all_coupons();

            return new WP_REST_Response($coupons, 200);
        }

        public function toggle_coupons(WP_REST_Request $request)
        {
            $enable_coupons = $request->get_param('enable');

            // עדכון הגדרה במסד הנתונים
            if ($enable_coupons === 'yes') {
                update_option('woocommerce_enable_coupons', 'yes');
            } else {
                update_option('woocommerce_enable_coupons', 'no');
            }

            return new WP_REST_Response(array('status' => 'success'), 200);
        }

        /**
         * פונקציה לבדיקה אם קופונים מופעלים
         */
        public function check_coupons_status()
        {
            $status = get_option('woocommerce_enable_coupons', 'no'); // קבלת הערך הנוכחי של האפשרות
            return new WP_REST_Response(array('coupons_enabled' => $status), 200);
        }

        /**
         * בדיקת הרשאות למשתמש
         */
        public function permissions_check()
        {
            // בדיקה אם המשתמש הנוכחי הוא מנהל אתר או מנהל חנות
            if (current_user_can('manage_options') || current_user_can('manage_woocommerce')) {
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
