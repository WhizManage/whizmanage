<?php
/**
 * Whizmanage_custom_taxonomy_exporter
 *
 * - Keeps product taxonomies (including WooCommerce attribute taxonomies pa_*)
 *   in sync when products/variations are updated via the REST API.
 * - Exports all non-default product taxonomies (including attributes) as JSON
 *   for use in a React admin application.
 * - Includes attribute taxonomy IDs (attribute_id) in the export.
 * - Uses a transient cache for the export with automatic invalidation hooks.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! class_exists( 'Whizmanage_custom_taxonomy_exporter' ) ) {

    class Whizmanage_custom_taxonomy_exporter {

        /**
         * Transient key for exported taxonomies JSON.
         *
         * @var string
         */
        private $cache_key = 'whizmanage_custom_taxonomies_export';

        /**
         * Constructor.
         *
         * Registers hooks for:
         * - syncing taxonomies via REST
         * - normalizing variation attributes via REST
         * - invalidating export cache when taxonomies/terms/attributes change
         */
        public function __construct() {

            // Capture batch request data at the REST API level before WooCommerce processes it.
            add_filter(
                'rest_pre_dispatch',
                array( $this, 'capture_rest_batch_data' ),
                1,
                3
            );

            // Also try to capture in pre_insert hook (fallback).
            add_filter(
                'woocommerce_rest_pre_insert_product_object',
                array( $this, 'capture_batch_request_data' ),
                1,
                3
            );

            // Sync all non-default taxonomies when a product is created/updated via REST.
            add_action(
                'woocommerce_rest_insert_product_object',
                array( $this, 'update_all_taxonomies_via_rest' ),
                10,
                3
            );

            // Normalize variation attributes before saving (for global attributes).
            add_action(
                'woocommerce_rest_pre_insert_product_variation_object',
                array( $this, 'update_variation_pre_attribute_via_rest' ),
                10,
                3
            );

            // Normalize variation attributes after saving (for custom/internal attributes).
            add_action(
                'woocommerce_rest_insert_product_variation_object',
                array( $this, 'update_variation_attribute_via_rest' ),
                10,
                3
            );

            // Cache invalidation on term lifecycle events.
            add_action( 'created_term',  array( $this, 'flush_tax_cache' ), 10, 3 );
            add_action( 'edited_term',   array( $this, 'flush_tax_cache' ), 10, 3 );
            add_action( 'delete_term',   array( $this, 'flush_tax_cache' ), 10, 4 );

            // Cache invalidation when a taxonomy is registered.
            add_action( 'registered_taxonomy', array( $this, 'flush_tax_cache_generic' ), 10, 3 );

            // Cache invalidation when Woo attribute taxonomies are added/updated/deleted.
            add_action( 'woocommerce_attribute_added',   array( $this, 'flush_tax_cache_wc_attrs' ), 10, 2 );
            add_action( 'woocommerce_attribute_updated', array( $this, 'flush_tax_cache_wc_attrs' ), 10, 2 );
            add_action( 'woocommerce_attribute_deleted', array( $this, 'flush_tax_cache_wc_attrs' ), 10, 2 );
        }

        /**
         * Capture batch request data at the REST API level.
         *
         * This hook runs before WooCommerce processes the batch, ensuring we have
         * access to the full request body.
         *
         * @param mixed           $result  Response to replace the requested version with. Can be anything a normal endpoint can return.
         * @param WP_REST_Server  $server  Server instance.
         * @param WP_REST_Request $request REST request.
         *
         * @return mixed
         */
        public function capture_rest_batch_data( $result, $server, $request ) {
            // Only capture for product batch routes
            $route = $request->get_route();
            if ( strpos( $route, '/wc/v3/products/batch' ) !== false || strpos( $route, '/wc/v2/products/batch' ) !== false ) {
                // Clear any previous batch data
                unset( $GLOBALS['whizmanage_batch_data'] );

                // Try get_json_params first
                $params = $request->get_json_params();

                if ( ! empty( $params ) ) {
                    $GLOBALS['whizmanage_batch_data'] = $params;
                } else {
                    // Fallback to raw body
                    $body = $request->get_body();
                    if ( ! empty( $body ) ) {
                        $decoded = json_decode( $body, true );
                        if ( is_array( $decoded ) ) {
                            $GLOBALS['whizmanage_batch_data'] = $decoded;
                        }
                    }
                }
            }
            return $result;
        }

        /**
         * Capture batch request data before WooCommerce processes it.
         *
         * This is needed because get_json_params() returns null in batch context
         * after WooCommerce starts processing individual items.
         *
         * @param WC_Product      $object   Product object.
         * @param WP_REST_Request $request  REST request.
         * @param bool            $creating Whether this is a create or update.
         *
         * @return WC_Product
         */
        public function capture_batch_request_data( $object, $request, $creating ) {
            // Only capture once per request (fallback if rest_pre_dispatch didn't run)
            if ( ! isset( $GLOBALS['whizmanage_batch_data'] ) ) {
                // Try get_json_params first
                $params = $request->get_json_params();

                if ( ! empty( $params ) ) {
                    $GLOBALS['whizmanage_batch_data'] = $params;
                } else {
                    // Fallback to raw body
                    $body = $request->get_body();
                    if ( ! empty( $body ) ) {
                        $decoded = json_decode( $body, true );
                        if ( is_array( $decoded ) ) {
                            $GLOBALS['whizmanage_batch_data'] = $decoded;
                        }
                    }
                }
            }
            return $object;
        }

        /**
         * Update all (non-default) product taxonomies from REST payload.
         *
         * Reads the JSON body from WP_REST_Request and maps term IDs to each taxonomy.
         *
         * @param WC_Product      $object   Product object.
         * @param WP_REST_Request $request  REST request.
         * @param bool            $creating Whether this is a create or update.
         *
         * @return WC_Product
         */
        public function update_all_taxonomies_via_rest( $object, $request, $creating ) {

            if ( ! ( $object instanceof WC_Product ) || ! ( $request instanceof WP_REST_Request ) ) {
                return $object;
            }

            // All taxonomies attached to 'product' (names only).
            $taxonomies = get_object_taxonomies( 'product', 'names' );

            // Default Woo taxonomies to skip (can be filtered).
            $exclude_taxonomies = (array) apply_filters(
                'whizmanage/export_skip_taxonomies',
                array(
                    'product_cat',
                    'product_tag',
                    'product_shipping_class',
                    'product_visibility',
                    'product_type',
                )
            );

            $product_id = $object->get_id();
            $product_params = null;

            // Try multiple methods to get product params
            // Method 1: Direct request params (works for single product updates)
            $params = $request->get_json_params();

            if ( ! empty( $params ) ) {
                // Check for batch request with 'update' key
                if ( isset( $params['update'] ) && is_array( $params['update'] ) ) {
                    foreach ( $params['update'] as $item ) {
                        if ( isset( $item['id'] ) && (int) $item['id'] === $product_id ) {
                            $product_params = $item;
                            break;
                        }
                    }
                }
                // Check for batch request as direct array (indexed array)
                elseif ( is_array( $params ) && isset( $params[0] ) && is_array( $params[0] ) ) {
                    foreach ( $params as $item ) {
                        if ( isset( $item['id'] ) && (int) $item['id'] === $product_id ) {
                            $product_params = $item;
                            break;
                        }
                    }
                }
                // Single product update
                elseif ( isset( $params['id'] ) && (int) $params['id'] === $product_id ) {
                    $product_params = $params;
                }
                // No ID in params but has data (single product)
                elseif ( ! isset( $params['update'] ) && ! isset( $params['create'] ) && ! isset( $params['delete'] ) ) {
                    $product_params = $params;
                }
            }

            // Method 2: Try raw body if params is empty (batch context)
            if ( empty( $product_params ) ) {
                $body = $request->get_body();
                if ( ! empty( $body ) ) {
                    $body_params = json_decode( $body, true );
                    if ( is_array( $body_params ) ) {
                        // Check for batch request with 'update' key
                        if ( isset( $body_params['update'] ) && is_array( $body_params['update'] ) ) {
                            foreach ( $body_params['update'] as $item ) {
                                if ( isset( $item['id'] ) && (int) $item['id'] === $product_id ) {
                                    $product_params = $item;
                                    break;
                                }
                            }
                        }
                        // Check for direct array
                        elseif ( isset( $body_params[0] ) && is_array( $body_params[0] ) ) {
                            foreach ( $body_params as $item ) {
                                if ( isset( $item['id'] ) && (int) $item['id'] === $product_id ) {
                                    $product_params = $item;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Method 3: Check global batch data cache (populated by filter hook)
            if ( empty( $product_params ) && ! empty( $GLOBALS['whizmanage_batch_data'] ) ) {
                $batch_data = $GLOBALS['whizmanage_batch_data'];
                if ( isset( $batch_data['update'] ) && is_array( $batch_data['update'] ) ) {
                    foreach ( $batch_data['update'] as $item ) {
                        if ( isset( $item['id'] ) && (int) $item['id'] === $product_id ) {
                            $product_params = $item;
                            break;
                        }
                    }
                }
            }

            // If no product params found, skip taxonomy processing
            if ( empty( $product_params ) ) {
                return $object;
            }

            foreach ( $taxonomies as $taxonomy ) {

                if ( in_array( $taxonomy, $exclude_taxonomies, true ) ) {
                    continue;
                }

                // Support keys with and without leading underscore.
                $clean_key = ltrim( (string) $taxonomy, '_' );
                $terms_payload = null;

                if ( isset( $product_params[ $clean_key ] ) ) {
                    $terms_payload = $product_params[ $clean_key ];
                } elseif ( isset( $product_params[ '_' . $clean_key ] ) ) {
                    $terms_payload = $product_params[ '_' . $clean_key ];
                }

                if ( is_array( $terms_payload ) && ! empty( $terms_payload ) ) {

                    $term_ids = array();

                    foreach ( $terms_payload as $item ) {
                        if ( is_array( $item ) && isset( $item['id'] ) ) {
                            $term_ids[] = (int) $item['id'];
                        } elseif ( is_object( $item ) && isset( $item->id ) ) {
                            $term_ids[] = (int) $item->id;
                        }
                    }

                    $term_ids = array_filter( array_map( 'absint', $term_ids ) );

                    if ( ! empty( $term_ids ) ) {
                        wp_set_object_terms( $object->get_id(), $term_ids, $taxonomy );
                    }
                }
            }

            return $object;
        }

        /**
         * Pre-insert variation attribute normalization for global attributes (ID > 0).
         *
         * Converts attribute names/options for global attributes into their slug-based format,
         * and merges them into the existing variation attributes without saving the object.
         *
         * @param WC_Product_Variation $object   Variation object.
         * @param WP_REST_Request      $request  REST request.
         * @param bool                 $creating Whether this is a create or update.
         *
         * @return WC_Product_Variation
         */
        public function update_variation_pre_attribute_via_rest( $object, $request, $creating ) {

            if ( ! ( $object instanceof WC_Product_Variation ) || ! ( $request instanceof WP_REST_Request ) ) {
                return $object;
            }

            // For creation we usually let WooCommerce set attributes itself.
            if ( $creating ) {
                return $object;
            }

            $attributes          = $object->get_attributes();
            $attributes          = is_array( $attributes ) ? $attributes : array();
            $incoming_attributes = $request->get_param( 'attributes' );

            if ( is_array( $incoming_attributes ) ) {

                foreach ( $incoming_attributes as $attr ) {

                    $name   = isset( $attr['name'] )   ? (string) $attr['name']   : '';
                    $option = isset( $attr['option'] ) ? (string) $attr['option'] : '';
                    $id     = isset( $attr['id'] )     ? (int) $attr['id']       : null;

                    // Missing name or option – nothing to do.
                    if ( '' === $name || '' === $option ) {
                        continue;
                    }

                    // id = 0 => internal (custom) attribute, handled later in post hook.
                    $is_internal = ( null !== $id && 0 === (int) $id );
                    if ( $is_internal ) {
                        continue;
                    }

                    // Global attribute: use slug-based key/value.
                    $attribute_key   = sanitize_title( urldecode( isset( $attr['slug'] ) ? (string) $attr['slug'] : $name ) );
                    $attribute_value = sanitize_title( urldecode( $option ) );

                    $attributes[ $attribute_key ] = $attribute_value;
                }

                // Update attributes in memory only (no save()).
                $object->set_attributes( $attributes );
            }

            return $object;
        }

        /**
         * Post-insert variation attribute normalization for internal/custom attributes (ID = 0).
         *
         * Ensures custom (internal) attributes keep their raw names and values.
         *
         * @param WC_Product_Variation $object   Variation object.
         * @param WP_REST_Request      $request  REST request.
         * @param bool                 $creating Whether this is a create or update.
         *
         * @return WC_Product_Variation
         */
        public function update_variation_attribute_via_rest( $object, $request, $creating ) {

            if ( ! ( $object instanceof WC_Product_Variation ) || ! ( $request instanceof WP_REST_Request ) ) {
                return $object;
            }

            if ( $creating ) {
                return $object;
            }

            $incoming_attributes = $request->get_param( 'attributes' );

            if ( is_array( $incoming_attributes ) ) {

                foreach ( $incoming_attributes as $attr ) {

                    $name   = isset( $attr['name'] )   ? (string) $attr['name']   : '';
                    $option = isset( $attr['option'] ) ? (string) $attr['option'] : '';
                    $id     = isset( $attr['id'] )     ? (int) $attr['id']       : null;

                    if ( '' === $name || '' === $option ) {
                        continue;
                    }

                    $is_internal = ( null !== $id && 0 === (int) $id );

                    // Internal/custom attribute: keep the original name and raw value.
                    if ( $is_internal ) {
                        $attributes = $object->get_attributes();
                        $attributes = is_array( $attributes ) ? $attributes : array();

                        $attributes[ $name ] = urldecode( $option );

                        $object->set_attributes( $attributes );
                    }
                }
            }

            return $object;
        }

        /**
         * Export all non-default product taxonomies (including pa_* attribute taxonomies) as JSON.
         *
         * Example structure:
         * [
         *   {
         *     "name": "_product_cat",
         *     "label": "Categories",
         *     "id": 0,
         *     "hierarchical": true,
         *     "terms": [
         *       { "id": 1, "name": "Clothing", "slug": "clothing" },
         *       ...
         *     ]
         *   },
         *   {
         *     "name": "_pa_color",
         *     "label": "Color",
         *     "id": 12,
         *     "hierarchical": false,
         *     "terms": [ ... ]
         *   }
         * ]
         *
         * @return string JSON-encoded array of taxonomies.
         */
        public function export_custom_taxonomies_to_js() {

            // Optional request-based manual cache bust: ?wm_refresh_tax=1
            if ( isset( $_GET['wm_refresh_tax'] ) && '1' === (string) $_GET['wm_refresh_tax'] ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
                delete_transient( $this->cache_key );
            }

            // Try to read from transient cache.
            $cached = get_transient( $this->cache_key );
            if ( false !== $cached && is_string( $cached ) ) {
                return $cached;
            }

            // All product taxonomies (with full objects).
            $taxonomies = get_object_taxonomies( 'product', 'objects' );

            // Default Woo taxonomies we skip in this export.
            $default_taxonomies = array(
                'product_cat',
                'product_tag',
                'product_shipping_class',
                'product_visibility',
                'product_type',
            );

            // Map attribute taxonomy name (e.g. pa_color) -> attribute_id.
            $attribute_taxonomies = function_exists( 'wc_get_attribute_taxonomies' )
                ? wc_get_attribute_taxonomies()
                : array();

            $attr_id_map = array();

            foreach ( $attribute_taxonomies as $attr ) {

                if ( function_exists( 'wc_attribute_taxonomy_name' ) ) {
                    // e.g. "size" -> "pa_size".
                    $tax_name = wc_attribute_taxonomy_name( $attr->attribute_name );
                } else {
                    $tax_name = 'pa_' . $attr->attribute_name;
                }

                $attr_id_map[ $tax_name ] = (int) $attr->attribute_id;
            }

            $custom_taxonomies = array();

            foreach ( $taxonomies as $taxonomy ) {

                if ( in_array( $taxonomy->name, $default_taxonomies, true ) ) {
                    continue;
                }

                $terms = get_terms(
                    array(
                        'taxonomy'   => $taxonomy->name,
                        'hide_empty' => false,
                    )
                );

                $formatted_terms = $this->format_terms_flat( $terms );

                // Real attribute taxonomy ID if this taxonomy is a product attribute (pa_*).
                $attr_id = isset( $attr_id_map[ $taxonomy->name ] )
                    ? (int) $attr_id_map[ $taxonomy->name ]
                    : 0;

                $custom_taxonomies[] = array(
                    'name'         => '_' . urldecode( $taxonomy->name ),           // keep leading underscore for front-end compatibility.
                    'label'        => $this->clean_label( $taxonomy->label ),      // cleaned, plain label.
                    'id'           => $attr_id,                                     // attribute_id or 0 if not an attribute taxonomy.
                    'hierarchical' => is_taxonomy_hierarchical( $taxonomy->name ),
                    'terms'        => $formatted_terms,
                );
            }

            $json = wp_json_encode( $custom_taxonomies );

            // Cache the result for performance (1 day; adjust if needed).
            set_transient( $this->cache_key, $json, DAY_IN_SECONDS );

            return $json;
        }

        /**
         * Convert WP_Term list into a flat array of { id, name, slug }.
         *
         * @param WP_Term[]|WP_Error $terms Raw terms from get_terms().
         *
         * @return array
         */
        private function format_terms_flat( $terms ) {

            $output = array();

            if ( is_wp_error( $terms ) || empty( $terms ) ) {
                return $output;
            }

            foreach ( $terms as $term ) {

                if ( ! ( $term instanceof WP_Term ) ) {
                    continue;
                }

                $output[] = array(
                    'id'   => (int) $term->term_id,
                    'name' => $this->clean_label( $term->name ),
                    'slug' => (string) $term->slug,
                );
            }

            return $output;
        }

        /**
         * Clean a label gently:
         * - decode HTML entities
         * - strip quote variants and escape characters
         * - strip JSON-style unicode escape sequences
         * - trim whitespace
         *
         * @param string $label Raw label.
         *
         * @return string Cleaned label.
         */
        private function clean_label( $label ) {

            // Decode HTML entities.
            $cleaned = htmlspecialchars_decode( (string) $label, ENT_QUOTES );

            // Normalize various quote characters to nothing.
            $cleaned = str_replace(
                array( '"', '“', '”', '„', "'", '‘', '’' ),
                '',
                $cleaned
            );

            // Remove escape characters like \, \n, \r, \t.
            $cleaned = str_replace(
                array( '\\', "\n", "\r", "\t" ),
                '',
                $cleaned
            );

            // Remove unicode escape sequences of the form \uXXXX.
            $cleaned = preg_replace( '/\\\\u[0-9a-fA-F]{4}/', '', $cleaned );

            // Final trim.
            $cleaned = trim( $cleaned );

            return $cleaned;
        }

        /* --------------------------------------------------------------------
         * Cache invalidation handlers
         * ------------------------------------------------------------------ */

        /**
         * Flush export cache when a term is created/edited/deleted.
         *
         * @param int    $term_id  Term ID.
         * @param int    $tt_id    Term taxonomy ID.
         * @param string $taxonomy Taxonomy name.
         */
        public function flush_tax_cache( $term_id = 0, $tt_id = 0, $taxonomy = '' ) {
            delete_transient( $this->cache_key );
        }

        /**
         * Flush export cache when a taxonomy is registered.
         *
         * @param string       $taxonomy   Taxonomy name.
         * @param array|string $object_type Object type(s) for the taxonomy.
         * @param array        $args       Taxonomy args.
         */
        public function flush_tax_cache_generic( $taxonomy, $object_type, $args ) {
            delete_transient( $this->cache_key );
        }

        /**
         * Flush export cache when WooCommerce product attributes are added/updated/deleted.
         *
         * @param int   $attr_id Attribute ID.
         * @param array $data    Attribute data.
         */
        public function flush_tax_cache_wc_attrs( $attr_id = 0, $data = array() ) {
            delete_transient( $this->cache_key );
        }
    }
}
