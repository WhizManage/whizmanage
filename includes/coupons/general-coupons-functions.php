<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}
if (!class_exists('Whizmanage_general_coupons_functions')) {
    class Whizmanage_general_coupons_functions
    {

        public function __construct()
        {
            add_action('woocommerce_rest_insert_shop_coupon_object', [$this, 'after_post_and_put'], 10, 2); // for the post and put
            add_filter('woocommerce_rest_prepare_shop_coupon_object', [$this, 'after_get'], 10, 3); // for the get
        }

        public function after_post_and_put($coupon, $request)
        {
            $this->handle_date_created($coupon, $request);
            $this->handle_coupon_status($coupon, $request);
            $coupon->save(); // מבצע שמירה אחת אחרי הכל
        }

        public function after_get($response, $coupon, $request)
        {
            $response->data['excluded_product_names'] = $this->get_product_names($request["excluded_product_ids"]);
            $response->data['product_names'] = $this->get_product_names($request["product_ids"]);
            $response->data['status'] = sanitize_text_field($request['status']);
            $response->data['date'] = $response->data['date_created'];
            unset($response->data["date_created"]);
            return $response;
        }

        private function get_product_names($product_ids)
        {
            if (empty($product_ids)) {
                return [];
            }

            $product_names = [];
            foreach ($product_ids as $product_id) {
                $product = wc_get_product($product_id);
                if ($product) {
                    if ($product->is_type('variation')) {
                        // אם מדובר בווריאציה, קבל את שם הווריאציה המלא
                        $variation_name = $product->get_name() . ' - ';
                        $attributes = $product->get_attributes();

                        foreach ($attributes as $attribute_name => $attribute_value) {
                            $variation_name .= urldecode(wc_attribute_taxonomy_slug($attribute_name) . ': ' . $attribute_value . ' ');
                        }

                        $product_names[] = trim($variation_name);
                    } else {
                        // אם מדובר במוצר רגיל
                        $product_names[] = $product->get_name();
                    }
                }
            }

            return $product_names;
        }
        private function handle_date_created($coupon, $request)
        {
            try {
                $custom_date = $request->get_param('date');
                $timezone_string = get_option('timezone_string');
                if (!$timezone_string) {
                    $offset = get_option('gmt_offset');
                    $timezone_string = timezone_name_from_abbr("", $offset * 3600, 0);
                }

                $local_timezone = new DateTimeZone($timezone_string);
                $date = new DateTime($custom_date, $local_timezone);

                // יוצר WC_DateTime וממיר ל-UTC
                $wc_date = new WC_DateTime($date->format('Y-m-d H:i:s'), $local_timezone);
                $wc_date->setTimezone(new DateTimeZone('UTC'));

                $coupon->set_date_created($wc_date);
            } catch(Exception $e){
             
            }
        }

        private function handle_coupon_status($coupon, $request)
        {
            $coupon_id = $coupon->get_id();

            if (isset($request['status'])) {
                $status = sanitize_text_field($request['status']);

                // שינוי post_status ישירות
                wp_update_post([
                    'ID' => $coupon_id,
                    'post_status' => $status,
                ]);

                // אופציונלי: שמירת הסטטוס גם ב-meta
                update_post_meta($coupon_id, 'status', $status);

            } else {
             
            }
        }
    }
}
