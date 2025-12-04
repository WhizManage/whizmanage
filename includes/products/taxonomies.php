<?php

/**
 * Export and maintain product-related taxonomies (including Woo attribute taxonomies pa_*)
 * for the admin React app, and keep product/variation terms in sync when updated via
 * WooCommerce REST API.
 *
 * Highlights:
 * - Proper REST param access via WP_REST_Request.
 * - Includes product attributes (pa_*) by default.
 * - Transient cache with automatic invalidation on relevant changes.
 * - Manual cache refresh via ?wm_refresh_tax=1.
 * - No hardcoded paths; English-only comments/logs (WP.org-friendly).
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('Whizmanage_custom_taxonomy_exporter')) {

    class Whizmanage_custom_taxonomy_exporter
    {

        /**
         * Transient key for exported taxonomies JSON.
         * @var string
         */
        private $cache_key = 'whizmanage_custom_taxonomies_export';

        public function __construct()
        {
            // Sync custom taxonomies on product save via Woo REST.
            add_action('woocommerce_rest_insert_product_object', array($this, 'update_all_taxonomies_via_rest'), 10, 3);

            // Normalize variation attributes around REST insert.
            add_action('woocommerce_rest_pre_insert_product_variation_object', array($this, 'update_variation_pre_attribute_via_rest'), 10, 3);
            add_action('woocommerce_rest_insert_product_variation_object',     array($this, 'update_variation_attribute_via_rest'), 10, 3);

            // Bust cache automatically on taxonomy/term/attribute lifecycle changes.
            add_action('created_term',          array($this, 'flush_tax_cache'), 10, 3);
            add_action('edited_term',           array($this, 'flush_tax_cache'), 10, 3);
            add_action('delete_term',           array($this, 'flush_tax_cache'), 10, 4);
            add_action('registered_taxonomy',   array($this, 'flush_tax_cache_generic'), 10, 3);

            add_action('woocommerce_attribute_added',   array($this, 'flush_tax_cache_wc_attrs'), 10, 2);
            add_action('woocommerce_attribute_updated', array($this, 'flush_tax_cache_wc_attrs'), 10, 2);
            add_action('woocommerce_attribute_deleted', array($this, 'flush_tax_cache_wc_attrs'), 10, 2);
        }

        /**
         * Update all (non-default) product taxonomies from REST payload.
         *
         * @param WC_Product      $object
         * @param WP_REST_Request $request
         * @param bool            $creating
         * @return WC_Product
         */
        public function update_all_taxonomies_via_rest($object, $request, $creating)
        {
            if (! ($object instanceof WC_Product) || ! ($request instanceof WP_REST_Request)) {
                return $object;
            }

            $taxonomies = get_object_taxonomies('product', 'names');

            // Default Woo taxonomies we skip here (you can adjust via filter).
            $exclude_taxonomies = (array) apply_filters(
                'whizmanage/export_skip_taxonomies',
                array('product_tag', 'product_shipping_class', 'product_visibility', 'product_type')
            );

            $params = $request->get_json_params();

            foreach ($taxonomies as $taxonomy) {
                if (in_array($taxonomy, $exclude_taxonomies, true)) {
                    continue;
                }

                $clean_key = ltrim((string) $taxonomy, '_');

                $terms_payload = null;
                if (isset($params[$clean_key])) {
                    $terms_payload = $params[$clean_key];
                } elseif (isset($params['_' . $clean_key])) {
                    $terms_payload = $params['_' . $clean_key];
                }

                if (is_array($terms_payload) && ! empty($terms_payload)) {
                    $term_ids = array();

                    foreach ($terms_payload as $item) {
                        if (is_array($item) && isset($item['id'])) {
                            $term_ids[] = (int) $item['id'];
                        } elseif (is_object($item) && isset($item->id)) {
                            $term_ids[] = (int) $item->id;
                        }
                    }

                    $term_ids = array_filter(array_map('absint', $term_ids));
                    if (! empty($term_ids)) {
                        wp_set_object_terms($object->get_id(), $term_ids, $taxonomy);
                    }
                }
            }

            return $object;
        }

        /**
         * Pre-insert variation attributes normalization (global attributes to slugs).
         *
         * @param WC_Product_Variation $object
         * @param WP_REST_Request      $request
         * @param bool                 $creating
         * @return WC_Product_Variation
         */
        public function update_variation_pre_attribute_via_rest($object, $request, $creating)
        {
            if (! ($object instanceof WC_Product_Variation) || ! ($request instanceof WP_REST_Request)) {
                return $object;
            }
            if ($creating) {
                return $object;
            }

            $attributes          = $object->get_attributes();
            $attributes          = is_array($attributes) ? $attributes : array();
            $incoming_attributes = $request->get_param('attributes');

            if (is_array($incoming_attributes)) {
                foreach ($incoming_attributes as $attr) {
                    $name   = isset($attr['name'])   ? (string) $attr['name']   : '';
                    $option = isset($attr['option']) ? (string) $attr['option'] : '';
                    $id     = isset($attr['id'])     ? (int) $attr['id']       : null;

                    if ('' === $name || '' === $option) {
                  
                        continue;
                    }

                    // id = 0 means internal (custom) product attribute; skip here.
                    $is_internal = (null !== $id && 0 === (int) $id);
                    if ($is_internal) {
                        continue;
                    }

                    $attribute_key   = sanitize_title(urldecode(isset($attr['slug']) ? (string) $attr['slug'] : $name));
                    $attribute_value = sanitize_title(urldecode($option));

                    $attributes[$attribute_key] = $attribute_value;
                }

                $object->set_attributes($attributes); // Do not save() here.
            } else {
        
            }

            return $object;
        }

        /**
         * Post-insert variation attributes normalization (custom/internal attributes raw).
         *
         * @param WC_Product_Variation $object
         * @param WP_REST_Request      $request
         * @param bool                 $creating
         * @return WC_Product_Variation
         */
        public function update_variation_attribute_via_rest($object, $request, $creating)
        {
            if (! ($object instanceof WC_Product_Variation) || ! ($request instanceof WP_REST_Request)) {
                return $object;
            }
            if ($creating) {
                return $object;
            }

            $incoming_attributes = $request->get_param('attributes');

            if (is_array($incoming_attributes)) {
                foreach ($incoming_attributes as $attr) {
                    $name   = isset($attr['name'])   ? (string) $attr['name']   : '';
                    $option = isset($attr['option']) ? (string) $attr['option'] : '';
                    $id     = isset($attr['id'])     ? (int) $attr['id']       : null;

                    if ('' === $name || '' === $option) {
                      
                        continue;
                    }

                    $is_internal = (null !== $id && 0 === (int) $id);
                    if ($is_internal) {
                        $attributes           = $object->get_attributes();
                        $attributes           = is_array($attributes) ? $attributes : array();
                        $attributes[$name]  = urldecode($option); // keep raw for custom attribute
                        $object->set_attributes($attributes);
                    }
                }
            } else {

            }

            return $object;
        }

        /**
         * Export product taxonomies (including attributes pa_*) to JSON for the admin app.
         *
         * Structure:
         * [
         *   { "name": "_product_cat", "label": "Categories", "terms": [ { "id": 1, "name": "Clothing", "slug": "clothing" }, ... ] },
         *   { "name": "_pa_color", "label": "Color", "terms": [ ... ] },
         *   ...
         * ]
         *
         * @return string JSON-encoded array.
         */
        public function export_custom_taxonomies_to_js()
        {
            // Allow manual refresh via URL param to bypass cache for the current request.
            $force_refresh = isset($_GET['wm_refresh_tax']) && '1' === $_GET['wm_refresh_tax']; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

            $cache_ttl = (int) apply_filters('whizmanage/tax_cache_ttl', HOUR_IN_SECONDS);

            if (! $force_refresh && $cache_ttl > 0) {
                $cached = get_transient($this->cache_key);
                if (false !== $cached) {
                    return $cached;
                }
            }

            $taxonomies = get_object_taxonomies('product', 'objects');

            // Skip these defaults (you can override via filter); we still include product_cat as it’s commonly needed.
            $default_taxonomies_to_skip = (array) apply_filters(
                'whizmanage/export_skip_taxonomies',
                array('product_tag', 'product_shipping_class', 'product_visibility', 'product_type')
            );

            $include_attributes = (bool) apply_filters('whizmanage/export_include_attributes', true);

            $result = array();

            foreach ($taxonomies as $taxonomy) {
                if (! ($taxonomy instanceof WP_Taxonomy)) {
                    continue;
                }

                // Optionally skip pa_* if a site owner disables them via filter.
                if (false === $include_attributes && 0 === strpos($taxonomy->name, 'pa_')) {
                    continue;
                }

                if (in_array($taxonomy->name, $default_taxonomies_to_skip, true)) {
                    continue;
                }

                $terms = get_terms(
                    array(
                        'taxonomy'   => $taxonomy->name,
                        'hide_empty' => false,
                    )
                );

                $result[] = array(
                    // Keep underscore to match existing frontend expectations.
                    'name'  => '_' . $taxonomy->name,
                    'label' => $this->clean_label($taxonomy->label),
                    'terms' => $this->format_terms_flat($terms),
                );
            }

            $json =$result;

            // Store JSON as-is; skip caching if TTL is 0.
            if ($cache_ttl > 0) {
                set_transient($this->cache_key, $json, $cache_ttl);
            }

            return $json;
        }

        /**
         * Convert WP_Term list into a flat array of { id, name, slug }.
         *
         * @param WP_Term[]|WP_Error $terms
         * @return array
         */
        private function format_terms_flat($terms)
        {
            $output = array();

            if (is_wp_error($terms) || empty($terms)) {
                return $output;
            }

            foreach ($terms as $term) {
                if (! ($term instanceof WP_Term)) {
                    continue;
                }

                $output[] = array(
                    'id'   => (int) $term->term_id,
                    'name' => $this->clean_label($term->name),
                    'slug' => (string) $term->slug,
                );
            }

            return $output;
        }

        /**
         * Clean label gently: strip tags, decode entities, trim.
         *
         * @param string $label
         * @return string
         */
        private function clean_label($name)
        {
            // הסרת תווי HTML
            $cleaned = htmlspecialchars_decode($name, ENT_QUOTES);

            // המרת גרשיים כפולות ויחידות לגרסאות פשוטות
            $cleaned = str_replace(['"', '“', '”', '„', "'", '‘', '’'], '', $cleaned);

            // הסרת תווי בריחה כמו \n, \r, \t, וכו'
            $cleaned = str_replace(['\\', "\n", "\r", "\t"], '', $cleaned);

            // הסרת יוניקוד שאינו תווים רגילים
            $cleaned = preg_replace('/\\\\u[0-9a-fA-F]{4}/', '', $cleaned);

            // המרת כל הטקסט לאותיות קטנות
            //     $cleaned = mb_strtolower($cleaned, 'UTF-8');

            // הסרת רווחים מיותרים
            $cleaned = trim($cleaned);

            return $cleaned;
        }

        /* ---------------------------------------------------------------------
		 * Cache invalidation handlers
		 * -------------------------------------------------------------------*/

        /**
         * Flush export cache when a term is created/edited/deleted.
         */
        public function flush_tax_cache($term_id = 0, $tt_id = 0, $taxonomy = '')
        {
            delete_transient($this->cache_key);
        }

        /**
         * Flush export cache when a taxonomy is registered.
         */
        public function flush_tax_cache_generic($taxonomy, $object_type, $args)
        {
            delete_transient($this->cache_key);
        }

        /**
         * Flush export cache when Woo product attributes are added/updated/deleted.
         */
        public function flush_tax_cache_wc_attrs($attr_id = 0, $data = array())
        {
            delete_transient($this->cache_key);
        }
    }
}
