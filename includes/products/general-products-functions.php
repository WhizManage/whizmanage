<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}
if (!class_exists('Whizmanage_general_products_functions')) {
    class Whizmanage_general_products_functions
    {
        public function __construct()
        {
            // Use another hook triggered after initial save
            add_action("woocommerce_rest_insert_product_object", [$this, "update_products_api"], 10, 3);
            add_filter('woocommerce_rest_prepare_product_object', [$this, 'modify_product_response'], 10, 3);

            // Handle variation image attachments via WooCommerce REST API
            add_action("woocommerce_rest_insert_product_variation_object", [$this, "attach_variation_image"], 10, 3);
        }

        /**
         * Attach variation image to parent product in WordPress media library.
         *
         * @param WC_Product_Variation $variation The variation object.
         * @param WP_REST_Request $request The request object.
         * @param bool $creating Whether this is a new variation.
         */
        public function attach_variation_image($variation, $request, $creating)
        {
            $image_id = $variation->get_image_id();
            if ($image_id) {
                $parent_id = $variation->get_parent_id();
                if ($parent_id) {
                    global $wpdb;
                    $current_parent = (int) get_post_field('post_parent', $image_id);
                    if ($current_parent !== $parent_id) {
                        $wpdb->update(
                            $wpdb->posts,
                            ['post_parent' => $parent_id],
                            ['ID' => $image_id],
                            ['%d'],
                            ['%d']
                        );
                        clean_post_cache($image_id);
                    }
                }
            }
        }

        public function update_products_api($product, $request, $creating)
        {
            // Only if update (not creation)
            if (!$creating) {
                $this->handle_date_created($product, $request);
                $this->handle_description($product, $request);

                // Saves the product
                $product->save();
            }

            // Attach images to product in media library (update post_parent)
            $this->attach_images_to_product($product);
        }

        /**
         * Attach product images to the product in WordPress media library.
         * Updates post_parent of featured image and gallery images so they show as "Attached to" the product.
         *
         * @param WC_Product $product The product object.
         */
        private function attach_images_to_product($product)
        {
            $product_id = $product->get_id();
            $attachment_ids = [];

            // Get featured image ID
            $featured_image_id = $product->get_image_id();
            if ($featured_image_id) {
                $attachment_ids[] = $featured_image_id;
            }

            // Get gallery image IDs
            $gallery_ids = $product->get_gallery_image_ids();
            if (!empty($gallery_ids)) {
                $attachment_ids = array_merge($attachment_ids, $gallery_ids);
            }

            // Update post_parent for each attachment
            if (!empty($attachment_ids)) {
                global $wpdb;

                foreach ($attachment_ids as $attachment_id) {
                    // Only update if not already attached to this product
                    $current_parent = (int) get_post_field('post_parent', $attachment_id);
                    if ($current_parent !== $product_id) {
                        $wpdb->update(
                            $wpdb->posts,
                            ['post_parent' => $product_id],
                            ['ID' => $attachment_id],
                            ['%d'],
                            ['%d']
                        );
                        clean_post_cache($attachment_id);
                    }
                }
            }
        }

        private function handle_date_created($product, $request)
        {
            // Check for both possible fields
            $custom_date = $request->get_param('date_created_gmt') ?: $request->get_param('date_created');

            // If nothing arrived - exit
            if (empty($custom_date)) {
           
                return;
            }

            try {
             

                // Check if arriving in UTC (with Z at end)
                $is_utc = str_ends_with($custom_date, 'Z');
             

                if ($is_utc) {
                    // If Z exists - it is already UTC, just create WC_DateTime
                    $wc_date = new WC_DateTime($custom_date, new DateTimeZone('UTC'));
                  
                } else {
                    // If no Z - treat as local time and convert to UTC
                    $timezone_string = wp_timezone_string();
                  

                    $site_tz = new DateTimeZone($timezone_string);
                    $date = new DateTime($custom_date, $site_tz);
                    $wc_date = new WC_DateTime($date->format('Y-m-d H:i:s'), $site_tz);
                    $wc_date->setTimezone(new DateTimeZone('UTC'));  
                }

                // Direct update in database because set_date_created sometimes doesn't work
                global $wpdb;

                $result = $wpdb->update(
                    $wpdb->posts,
                    array(
                        'post_date' => $wc_date->date('Y-m-d H:i:s'),
                        'post_date_gmt' => $wc_date->date('Y-m-d H:i:s'),
                        'post_modified' => current_time('mysql'),
                        'post_modified_gmt' => current_time('mysql', 1)
                    ),
                    array('ID' => $product->get_id()),
                    array('%s', '%s', '%s', '%s'),
                    array('%d')
                );

                if ($result !== false) {
                   
                    // Clear cache
                    clean_post_cache($product->get_id());

                    // Update WooCommerce metadata
                    $product->set_date_created($wc_date);
                } else {
             
                }
            } catch (Exception $e) {

            }
        }

        private function handle_description($product, $request)
        {
            $raw_description = $request->get_param('description');
            $short_description = $request->get_param('short_description');

            if (!empty($raw_description)) {
                $product->set_description($raw_description);
            
            }

            if (!empty($short_description)) {
                $product->set_short_description($short_description);
      
            }
        }

        public function get_all_shipping_classes()
        {
            $shipping_classes = WC()->shipping()->get_shipping_classes();
            $result = [];

            foreach ($shipping_classes as $class) {
                $result[] = [
                    'id'   => $class->term_id,
                    'name' => $class->name,
                    'slug' => urldecode($class->slug),
                ];
            }
            return $result;
        }

        public function modify_product_response($response, $product, $request)
        {
            $response->data['my_custom_field'] = 'some value';
            $response->data['debug_date_created_gmt'] = $product->get_date_created()
                ? $product->get_date_created()->date('Y-m-d H:i:s')
                : null;

  
            return $response;
        }
    }
}
