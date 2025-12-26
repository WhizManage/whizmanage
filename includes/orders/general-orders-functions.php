<?php
if (! defined('ABSPATH')) {
    exit;
}
if (!class_exists('Whizmanage_general_products_functions')) {
    class Whizmanage_general_products_functions
    {

        public function __construct()
        {
            add_action('woocommerce_rest_insert_shop_order_object', [$this, 'after_post_and_put'], 10, 3);
            add_filter('woocommerce_rest_prepare_shop_order_object', [$this, 'after_get'], 10, 3);
        }

        public function after_post_and_put($order, $request, $creating)
        {
            $this->handle_date_created($order, $request);
            $order->save();
        }

        private function handle_date_created($order, $request)
        {
            $custom_date = $request->get_param('date_created_gmt');
            if ($custom_date) {
                try {
                    $datetime = new WC_DateTime($custom_date);
                    $order->set_date_created($datetime);
                } catch (Exception $e) {
                    // error_log('Invalid date_created format: ' . $custom_date);
                }
            }
        }

        public function after_get($response, $order, $request)
        {
           
            return $response;
        }
    }
}

