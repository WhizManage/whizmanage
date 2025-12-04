<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}
if (!class_exists('Whizmanage_coupons_controller')) {
    class Whizmanage_coupons_controller
    {

        /**
         * שליפת כל הקופונים
         */
        public function get_all_coupons()
        {
            // שאילתה לשליפת כל הקופונים
            $args = array(
                'post_type'      => 'shop_coupon',
                'posts_per_page' => -1, // שליפת כל הקופונים
                'post_status'    => 'any', // שליפה של כל הסטטוסים
            );

            $query = new WP_Query($args);
            $response = array();

            // מעבר על כל הקופונים שנמצאו בשאילתה
            while ($query->have_posts()) {
                $query->the_post();
                $coupon_id = get_the_ID();
                $coupon = new WC_Coupon($coupon_id);

                $coupon_data = array(
                    'id' => $coupon->get_id(),
                    'code' => $coupon->get_code(),
                    'amount' => $coupon->get_amount(),
                    'date' => $coupon->get_date_created() ? $coupon->get_date_created()->date('Y-m-d\TH:i:s') : null,
                    'date_created_gmt' => $coupon->get_date_created() ? $coupon->get_date_created()->date('Y-m-d\TH:i:s', true) : null,
                    'date_modified' => $coupon->get_date_modified() ? $coupon->get_date_modified()->date('Y-m-d\TH:i:s') : null,
                    'date_modified_gmt' => $coupon->get_date_modified() ? $coupon->get_date_modified()->date('Y-m-d\TH:i:s', true) : null,
                    'discount_type' => $coupon->get_discount_type(),
                    'description' => $coupon->get_description(),
                    'date_expires' => $coupon->get_date_expires() ? $coupon->get_date_expires()->date('Y-m-d\TH:i:s') : null,
                    'date_expires_gmt' => $coupon->get_date_expires() ? $coupon->get_date_expires()->date('Y-m-d\TH:i:s', true) : null,
                    'usage_count' => $coupon->get_usage_count(),
                    'individual_use' => $coupon->get_individual_use(),
                    'product_ids' => $coupon->get_product_ids(),
                    'product_names' => $this->get_product_names($coupon->get_product_ids()),
                    'excluded_product_ids' => $coupon->get_excluded_product_ids(),
                    'excluded_product_names' => $this->get_product_names($coupon->get_excluded_product_ids()),
                    'usage_limit' => $coupon->get_usage_limit(),
                    'usage_limit_per_user' => $coupon->get_usage_limit_per_user(),
                    'limit_usage_to_x_items' => $coupon->get_limit_usage_to_x_items(),
                    'free_shipping' => $coupon->get_free_shipping(),
                    'product_categories' => $coupon->get_product_categories(),
                    'excluded_product_categories' => $coupon->get_excluded_product_categories(),
                    'exclude_sale_items' => $coupon->get_exclude_sale_items(),
                    'minimum_amount' => $coupon->get_minimum_amount(),
                    'maximum_amount' => $coupon->get_maximum_amount(),
                    'status' => $coupon->get_status(),
                    'email_restrictions' => $coupon->get_email_restrictions(),
                    'used_by' => $coupon->get_used_by(),
                    'meta_data' => $coupon->get_meta_data(),
                    '_links' => array(
                        'self' => array(
                            array('href' => get_rest_url(null, '/wc/v3/coupons/' . $coupon->get_id()))
                        ),
                        'collection' => array(
                            array('href' => get_rest_url(null, '/wc/v3/coupons'))
                        )
                    )
                );

                $response[] = $coupon_data;
            }
            $response_coupons = $response;

            // איפוס הנתונים הגלובליים לאחר השאילתה
            wp_reset_postdata();

            return $response_coupons;
        }
        /**
         * מחזיר את שמות המוצרים לפי מזהי מוצרים.
         *
         * @param array $product_ids מערך של מזהי מוצרים.
         * @return array מערך שמות המוצרים.
         */
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

            return  $product_names;
        }
    }
}
