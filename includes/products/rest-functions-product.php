<?php


/**
 * REST endpoints for WhizManage product-related operations.
 *
 * Notes:
 * - Minimal behavioral changes to avoid breaking existing flows.
 * - Added English docblocks/comments and light formatting.
 * - Standardized a few REST responses to `rest_ensure_response`.
 * - Image upload flow uses `wp_remote_get` (already in your code); removed an early `file_get_contents` short-circuit.
 */

if (! defined('ABSPATH')) {
    exit; // Security: block direct access
}

require_once WHIZMANAGE_DIR . 'includes/products/get-product.php';
require_once WHIZMANAGE_DIR . 'includes/products/taxonomies.php';

if (! class_exists('Whizmanage_rest_functions_product')) {

    class Whizmanage_rest_functions_product
    {

        public function __construct()
        {
            add_action('rest_api_init', array($this, 'whizmanage_register_rest_route'));
        }

        /**
         * Registers all REST routes for this controller.
         *
         * Keep endpoints/namespaces as-is to avoid breaking clients.
         */
        public function whizmanage_register_rest_route()
        {

            register_rest_route(
                'whizmanage/v1',
                '/get_product/',
                array(
                    'methods'             => 'GET,POST',
                    'callback'            => array($this, 'whizmanage_get_product'),
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );

            register_rest_route(
                'whizmanage/v1',
                '/get_product_for_coupons/',
                array(
                    'methods'             => 'GET',
                    'callback'            => array($this, 'whizmanage_get_product_for_coupons'),
                    // Intentionally public (as in your original code)
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );

            register_rest_route(
                'whizmanage/v1',
                '/import_variations/',
                array(
                    'methods'             => 'POST',
                    'callback'            => array($this, 'handle_add_variations'),
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );


            register_rest_route(
                'whizmanage/v1',
                '/taxonomy/(?P<taxonomy>.+)/term',
                array(
                    'methods'             => 'POST',
                    'callback'            => array($this, 'add_term_to_taxonomy'),
                    'args'                => array(
                        'taxonomy'    => array(
                            'required'           => true,
                            'validate_callback'  => function ($param) {
                                // url-decode and strip prefixed underscores
                                $cleaned_param = ltrim(urldecode($param), '_');
                                return taxonomy_exists($cleaned_param);
                            },
                        ),
                        'name'        => array(
                            'required'           => true,
                            'type'               => 'string',
                            'sanitize_callback'  => 'sanitize_text_field',
                        ),
                        'slug'        => array(
                            'required'           => false,
                            'type'               => 'string',
                            'sanitize_callback'  => 'sanitize_title',
                        ),
                        'parent'      => array(
                            'required'           => false,
                            'type'               => 'integer',
                        ),
                        'description' => array(
                            'required'           => false,
                            'type'               => 'string',
                            'sanitize_callback'  => 'sanitize_textarea_field',
                        ),
                    ),
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );

            register_rest_route(
                'whizmanage/v1',
                '/taxonomy/(?P<taxonomy>.+)/term/(?P<term_id>\d+)',
                array(
                    'methods'             => 'DELETE',
                    'callback'            => array($this, 'delete_term_from_taxonomy'),
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );

            register_rest_route(
                'whizmanage/v1',
                '/taxonomy/(?P<taxonomy>.+)/term/(?P<term_id>\d+)',
                array(
                    'methods'             => 'PUT',
                    'callback'            => array($this, 'update_term_in_taxonomy'),
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );

            register_rest_route(
                'whizmanage/v1',
                '/taxonomy/(?P<taxonomy>.+)/terms',
                array(
                    'methods'             => 'GET',
                    'callback'            => array($this, 'get_terms_by_taxonomy'),
                    'args'                => array(
                        'taxonomy' => array(
                            'required'          => true,
                            'validate_callback' => function ($param) {
                                $decoded_param = urldecode($param);
                                $cleaned_param = ltrim($decoded_param, '_');
                                return taxonomy_exists($cleaned_param);
                            },
                        ),
                    ),
                    'permission_callback' => array($this, 'custom_plugin_check_permissions'),
                )
            );

            register_rest_route(
                'whizmanage/v1',
                '/products/simple-reorder',
                array(
                    'methods'             => 'POST',
                    'callback'            => array($this, 'handle_simple_product_reorder'),
                    'permission_callback' => function () {
                        // Narrower capability for product re-ordering
                        return current_user_can('edit_products');
                    },
                )
            );
        }




        private function calculate_gapped_order($prev_product_id, $next_product_id)
        {
            global $wpdb;
            // Gap basis (can be increased if fewer re-balances are desired)
            $GAP = 1000;
            $prev_order = null;
            $next_order = null;
            if ($prev_product_id) {
                $prev_order = (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT menu_order FROM {$wpdb->posts} WHERE ID=%d",
                    $prev_product_id
                ));
            }
            if ($next_product_id) {
                $next_order = (int) $wpdb->get_var($wpdb->prepare(
                    "SELECT menu_order FROM {$wpdb->posts} WHERE ID=%d",
                    $next_product_id
                ));
            }
            // No neighbors -> large initial value to leave gaps for future
            if ($prev_order === null && $next_order === null)
                return $GAP;
            // Insert at beginning
            if ($prev_order === null) {
                // Allocate before first: if gap exists – take average, otherwise shift small window
                return ($next_order > $GAP) ? ($next_order - $GAP) : max(0, $next_order - 1);
            }
            // Insert at end
            if ($next_order === null) {
                return $prev_order + $GAP;
            }
            // Insert in middle
            $mid = intdiv($prev_order + $next_order, 2);
            if ($mid === $prev_order || $mid === $next_order) {
                // No gap ("stuck") – mark as no space
                return null;
            }
            return $mid;
        }
        private function rebalance_local_window($center_id, $window = 150)
        {
            global $wpdb;

            $center_id = (int) $center_id;
            $window    = max(1, (int) $window);
            $gap       = 1000;

            // 1. Get center order
            $center_order = (int) $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT menu_order FROM {$wpdb->posts} WHERE ID = %d",
                    $center_id
                )
            );

            // 2. Split window: Get $half_window before and $half_window after
            $half_window = (int) ceil($window / 2);

            // Fetch "before" items (<= center)
            // We use ID as secondary sort to ensure stable cut
            $before_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT ID FROM {$wpdb->posts}
                     WHERE post_type = 'product'
                     AND (menu_order < %d OR (menu_order = %d AND ID <= %d))
                     ORDER BY menu_order DESC, ID DESC
                     LIMIT %d",
                    $center_order,
                    $center_order,
                    $center_id,
                    $half_window
                )
            );

            // Fetch "after" items (> center)
            $after_rows = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT ID FROM {$wpdb->posts}
                     WHERE post_type = 'product'
                     AND (menu_order > %d OR (menu_order = %d AND ID > %d))
                     ORDER BY menu_order ASC, ID ASC
                     LIMIT %d",
                    $center_order,
                    $center_order,
                    $center_id,
                    $half_window
                )
            );

            // 3. Merge and Sort
            // $before_rows came out DESC, so reverse them to be ASC
            $before_rows = array_reverse($before_rows);
            
            $rows = array_merge($before_rows, $after_rows);

            if (empty($rows)) {
                return 0;
            }

            // 4. Renumber in fixed jumps
            $i = 1;
            foreach ($rows as $row) {
                $post_id    = (int) $row->ID;
                $menu_order = $i * $gap;

                $wpdb->update(
                    $wpdb->posts,
                    array('menu_order' => $menu_order),
                    array('ID' => $post_id)
                );

                // Optional: Just clear cache instead of full save to be faster
                clean_post_cache($post_id);
                if (function_exists('wc_delete_product_transients')) {
                    wc_delete_product_transients($post_id);
                }

                $i++;
            }

            return count($rows);
        }

        public function handle_simple_product_reorder($request)
        {
            $product_id = absint($request->get_param('product_id'));
            $prev_product_id = $request->get_param('prev_product_id') ? absint($request->get_param('prev_product_id')) : null;
            $next_product_id = $request->get_param('next_product_id') ? absint($request->get_param('next_product_id')) : null;
            if (!$product_id) {
                return new WP_REST_Response(['success' => false, 'message' => 'Invalid product_id'], 400);
            }
            return new WP_REST_Response(
                $this->reorder_single_product($product_id, $prev_product_id, $next_product_id),
                200
            );
        }
        public function reorder_single_product($product_id, $prev_product_id = null, $next_product_id = null)
        {
            // Strict typing
            $product_id      = (int) $product_id;
            $prev_product_id = $prev_product_id ? (int) $prev_product_id : null;
            $next_product_id = $next_product_id ? (int) $next_product_id : null;

            // 1. Calculate new order with gap
            $new_order = $this->calculate_gapped_order($prev_product_id, $next_product_id);

            if (null === $new_order) {
                // No gap – local rebalance then retry
                $anchor_id = $prev_product_id ? $prev_product_id : $next_product_id;
                $anchor_id = $anchor_id ? (int) $anchor_id : 0;

                if ($anchor_id) {
                    $this->rebalance_local_window($anchor_id, 200);
                    $new_order = $this->calculate_gapped_order($prev_product_id, $next_product_id);
                }

                if (null === $new_order) {
                    return array(
                        'success' => false,
                        'message' => __('Local rebalance failed to create a gap', 'whizmanage'),
                    );
                }
            }

            $new_order = (int) $new_order;

            // 2. Update post via official WordPress API
            $result = wp_update_post(
                array(
                    'ID'         => $product_id,
                    'menu_order' => $new_order,
                ),
                true // Return WP_Error in case of failure
            );

            if (is_wp_error($result)) {
                return array(
                    'success' => false,
                    'message' => $result->get_error_message(),
                );
            }

            // 3. Clear WooCommerce cache and transients
            clean_post_cache($product_id);

            if (function_exists('wc_delete_product_transients')) {
                wc_delete_product_transients($product_id);
            }

            return array(
                'success'   => true,
                'new_order' => $new_order,
                'message'   => __('Reordered', 'whizmanage'),
            );
        }

        /**
         * List terms for a taxonomy (with simple shaping).
         */
        public function get_terms_by_taxonomy($request)
        {
            $taxonomy = $this->clean_taxonomy_name($request->get_param('taxonomy'));



            if (! taxonomy_exists($taxonomy)) {
                return new WP_Error('invalid_taxonomy', 'Taxonomy does not exist', array('status' => 404));
            }

            $terms = get_terms(
                array(
                    'taxonomy'   => $taxonomy,
                    'hide_empty' => false,
                )
            );

            $response = array_map(
                function ($term) {
                    return array(
                        'id'          => $term->term_id,
                        'name'        => $term->name,
                        'slug'        => urldecode($term->slug),
                        'parent'      => $term->parent,
                        'description' => $term->description,
                        'count'       => $term->count,
                    );
                },
                $terms
            );

            return rest_ensure_response($response);
        }

        /**
         * Create a new term under a taxonomy.
         */
        public function add_term_to_taxonomy($request)
        {
            $taxonomy    = $this->clean_taxonomy_name($request->get_param('taxonomy'));
            $name        = $request->get_param('name');
            $slug        = $request->get_param('slug');
            $parent      = $request->get_param('parent') ?? 0;
            $description = $request->get_param('description');

            $result = wp_insert_term(
                $name,
                $taxonomy,
                array(
                    'slug'        => $slug,
                    'parent'      => $parent,
                    'description' => $description,
                )
            );

            if (is_wp_error($result)) {
                return new WP_Error('term_creation_failed', $result->get_error_message(), array('status' => 400));
            }

            return rest_ensure_response(
                array(
                    'id'          => $result['term_id'],
                    'name'        => $name,
                    'slug'        => $slug,
                    'parent'      => $parent,
                    'description' => $description,
                    'taxonomy'    => $taxonomy,
                )
            );
        }
        /**
         * Update an existing term.
         */
        public function update_term_in_taxonomy($request)
        {
            $taxonomy    = $this->clean_taxonomy_name($request->get_param('taxonomy'));
            $term_id     = $request->get_param('term_id');
            $name        = $request->get_param('name');
            $slug        = $request->get_param('slug');
            $parent      = $request->get_param('parent');
            $description = $request->get_param('description');

            $existing_term = get_term($term_id, $taxonomy);

            if (is_wp_error($existing_term) || ! $existing_term) {
                return new WP_Error('term_not_found', 'Term not found.', array('status' => 404));
            }

            $args               = array();
            $args['name']       = $name ?: $existing_term->name;
            $args['slug']       = $slug ?: str_replace(' ', '-', $args['name']);
            $args['parent']     = (null !== $parent) ? $parent : $existing_term->parent;
            $args['description'] = $description ?: $existing_term->description;

            $result = wp_update_term($term_id, $taxonomy, $args);

            if (is_wp_error($result)) {
                return new WP_Error('term_update_failed', $result->get_error_message(), array('status' => 400));
            }

            return rest_ensure_response(
                array(
                    'id'          => $term_id,
                    'name'        => $args['name'],
                    'slug'        => $args['slug'],
                    'parent'      => $args['parent'],
                    'description' => $args['description'],
                    'taxonomy'    => $taxonomy,
                )
            );
        }


        /**
         * Delete a term from a taxonomy.
         */
        public function delete_term_from_taxonomy($request)
        {
            $taxonomy = $this->clean_taxonomy_name($request->get_param('taxonomy'));
            $term_id  = $request->get_param('term_id');

            $result = wp_delete_term($term_id, $taxonomy);

            if (is_wp_error($result)) {
                return new WP_Error('term_deletion_failed', $result->get_error_message(), array('status' => 400));
            }

            if (! $result) {
                return new WP_Error('term_not_found', 'Term not found or cannot be deleted.', array('status' => 404));
            }

            return rest_ensure_response(
                array(
                    'status'  => 'success',
                    'message' => 'Term deleted successfully.',
                )
            );
        }

        /**
         * Best-effort cleanup for taxonomy param (decode + strip underscore).
         * If cleaned value doesn't exist, return original string.
         */
        private function clean_taxonomy_name($taxonomy)
        {
            $decoded_taxonomy = urldecode($taxonomy);
            $cleaned_taxonomy = ltrim($decoded_taxonomy, '_');

            if (! taxonomy_exists($cleaned_taxonomy)) {
                return $taxonomy;
            }
            return $cleaned_taxonomy;
        }



        public function handle_add_variations($request)
        {
            $variations_data = $request->get_param('variations_data');

            if (!is_array($variations_data)) {
                return new WP_Error('invalid_data', 'Invalid data provided', array('status' => 400));
            }

            $processed_variation_ids = []; // Changed name to make clear it is processed, not just new
            $errors = [];

            foreach ($variations_data as $variation_data) {
                try {
                    $variation_id = isset($variation_data['id']) ? $variation_data['id'] : 0;
                    $variation = null;

                    // 1. Attempt to load existing variation for update
                    if ($variation_id) {
                        $variation = wc_get_product($variation_id);
                        if (!$variation || !$variation->is_type('variation')) {
                            // If ID sent but not found, throw error or continue to creation (depending on your logic)
                            throw new Exception('Variation ID ' . $variation_id . ' not found.');
                        }
                    }
                    // 2. Create new variation if no ID
                    else {
                        if (empty($variation_data['parent_id'])) {
                            throw new Exception('Parent ID is required for creating new variations.');
                        }

                        $product_id = $variation_data['parent_id'];
                        $product = wc_get_product($product_id);

                        if (!$product || !$product->is_type('variable')) {
                            throw new Exception('Product ID ' . $product_id . ' is not a valid variable product.');
                        }

                        $variation = new WC_Product_Variation();
                        $variation->set_parent_id($product_id);
                    }

                    // --- Handle Attributes ---
                    if (!empty($variation_data['attributes']) && is_array($variation_data['attributes'])) {
                        $attributes = [];
                        foreach ($variation_data['attributes'] as $attribute) {
                            if (!empty($attribute['name']) && !empty($attribute['option'])) {
                                $attribute_slug = sanitize_title(urldecode($attribute['slug']));
                                $option = sanitize_title(urldecode($attribute['option']));
                                if (!empty($attribute_slug) && !empty($option)) {
                                    $attributes[$attribute_slug] = $option;
                                }
                            }
                        }
                        $variation->set_attributes($attributes);
                    }

                    // --- Handle Setters (only if values exist in sent data) ---
                    // Use of isset prevents overwriting existing values with null in case of partial update
                    if (isset($variation_data['regular_price']))
                        $variation->set_regular_price($variation_data['regular_price']);
                    if (isset($variation_data['sale_price']))
                        $variation->set_sale_price($variation_data['sale_price']);
                    if (isset($variation_data['stock_quantity']))
                        $variation->set_stock_quantity($variation_data['stock_quantity']);
                    if (isset($variation_data['manage_stock']))
                        $variation->set_manage_stock($variation_data['manage_stock']);
                    if (isset($variation_data['stock_status']))
                        $variation->set_stock_status($variation_data['stock_status']);

                    // Dimensions and weight
                    if (isset($variation_data['weight']))
                        $variation->set_weight($variation_data['weight']);
                    if (isset($variation_data['dimensions']['length']))
                        $variation->set_length($variation_data['dimensions']['length']);
                    if (isset($variation_data['dimensions']['width']))
                        $variation->set_width($variation_data['dimensions']['width']);
                    if (isset($variation_data['dimensions']['height']))
                        $variation->set_height($variation_data['dimensions']['height']);

                    // SKU
                    if (!empty($variation_data['sku'])) {
                        $sku = $variation_data['sku'];
                        $existing_id = wc_get_product_id_by_sku($sku);
                        if (!$existing_id || $existing_id === $variation->get_id()) {
                            $variation->set_sku($sku);
                        }
                    }

                    // --- ✅ Image fix: support existing ID ---
                    if (!empty($variation_data['image']['id'])) {
                        // If image ID is sent (usually happens in edit)
                        $variation->set_image_id($variation_data['image']['id']);
                    }

                    // Save
                    $variation->save();

                    // Attach variation image to parent product in media library
                    $image_id = $variation->get_image_id();
                    if ($image_id) {
                        global $wpdb;
                        $current_parent = (int) get_post_field('post_parent', $image_id);
                        if ($current_parent !== $product_id) {
                            $wpdb->update(
                                $wpdb->posts,
                                ['post_parent' => $product_id],
                                ['ID' => $image_id],
                                ['%d'],
                                ['%d']
                            );
                            clean_post_cache($image_id);
                        }
                    }
                    $processed_variation_ids[] = $variation->get_id();
                } catch (Exception $e) {
                    $errors[] = $e->getMessage();
                }
            }

            return rest_ensure_response([
                'new_variation_ids' => $processed_variation_ids, // Name kept for compatibility with your JS
                'errors' => $errors,
            ]);
        }


        private function build_args_for_products_query(array $filters, int $offset = 0, int $limit = 10, string $fields = 'ids', bool $no_found_rows = false): array
        {
            $search = isset($filters['search']) ? trim((string) $filters['search']) : null;
            $status = !empty($filters['status']) ? (array) $filters['status'] : array('publish', 'draft', 'pending', 'future', 'private');
            $type = !empty($filters['type']) ? (array) $filters['type'] : [];
            $downloadable = isset($filters['downloadable']) ? $filters['downloadable'] : null;
            $stock_status = !empty($filters['stock_status']) ? (array) $filters['stock_status'] : [];
            $stock_quantity = isset($filters['stock_quantity']) && $filters['stock_quantity'] !== '' && $filters['stock_quantity'] !== null
                ? $filters['stock_quantity']
                : null;
            $product_cat = !empty($filters['product_cat']) ? (array) $filters['product_cat'] : [];
            $product_tag = !empty($filters['product_tag']) ? (array) $filters['product_tag'] : [];
            $tax_filters = !empty($filters['tax_filters']) && is_array($filters['tax_filters']) ? $filters['tax_filters'] : [];

            $args = array(
                'post_type' => 'product',
                'post_status' => $status,
                'posts_per_page' => $limit,
                'offset' => $offset,
                'fields' => $fields,       // 'ids' for count / 'all' if desired
                'no_found_rows' => $no_found_rows,
                // Basic SQL order only; your special sort happens inside after fetching
                'orderby' => array('menu_order' => 'ASC', 'date' => 'DESC', 'ID' => 'ASC'),
            );

            // search + SKU
            if ($search) {
                $args['s'] = $search;
                $args['meta_query'] = array(
                    'relation' => 'OR',
                    array(
                        'key' => '_sku',
                        'value' => $search,
                        'compare' => 'LIKE',
                    ),
                );
            }

            $meta_query = isset($args['meta_query']) ? $args['meta_query'] : array('relation' => 'AND');

            if ($downloadable === 'yes' || $downloadable === 'no') {
                $meta_query[] = array(
                    'key' => '_downloadable',
                    'value' => $downloadable === 'yes' ? 'yes' : 'no',
                    'compare' => '=',
                );
            }
            if (!empty($stock_status)) {
                $meta_query[] = array(
                    'key' => '_stock_status',
                    'value' => array_map('sanitize_text_field', $stock_status),
                    'compare' => 'IN',
                );
            }
            if (count($meta_query) > 1) {
                $args['meta_query'] = $meta_query;
            }

            // חיפוש לפי כמות מלאי מדויקת (מוצרים + ווריאציות)
            if ($stock_quantity !== null && is_numeric($stock_quantity)) {
                global $wpdb;
                $qty = intval($stock_quantity);

                $product_stock_ids = $wpdb->get_col(
                    $wpdb->prepare("
                        SELECT p.ID
                        FROM {$wpdb->posts} p
                        INNER JOIN {$wpdb->postmeta} m_stock ON m_stock.post_id = p.ID AND m_stock.meta_key = '_stock'
                        INNER JOIN {$wpdb->postmeta} m_manage ON m_manage.post_id = p.ID AND m_manage.meta_key = '_manage_stock'
                        WHERE p.post_type = 'product'
                          AND CAST(m_stock.meta_value AS SIGNED) = %d
                          AND m_manage.meta_value = 'yes'
                    ", $qty)
                );

                $variation_parent_ids = $wpdb->get_col(
                    $wpdb->prepare("
                        SELECT DISTINCT p.post_parent
                        FROM {$wpdb->posts} p
                        INNER JOIN {$wpdb->postmeta} m_stock ON m_stock.post_id = p.ID AND m_stock.meta_key = '_stock'
                        INNER JOIN {$wpdb->postmeta} m_manage ON m_manage.post_id = p.ID AND m_manage.meta_key = '_manage_stock'
                        WHERE p.post_type = 'product_variation'
                          AND CAST(m_stock.meta_value AS SIGNED) = %d
                          AND m_manage.meta_value = 'yes'
                    ", $qty)
                );

                $stock_ids = array_values(array_unique(array_filter(array_map('intval', array_merge(
                    (array) $product_stock_ids,
                    (array) $variation_parent_ids
                )))));

                if (empty($stock_ids)) {
                    $args['post__in'] = array(0);
                } else {
                    if (isset($args['post__in']) && !empty($args['post__in'])) {
                        $args['post__in'] = array_values(array_intersect(
                            array_map('intval', (array) $args['post__in']),
                            $stock_ids
                        ));
                        if (empty($args['post__in'])) {
                            $args['post__in'] = array(0);
                        }
                    } else {
                        $args['post__in'] = $stock_ids;
                    }
                }
            }

            $tax_query = array('relation' => 'AND');

            if (!empty($product_cat)) {
                $tax_query[] = array(
                    'taxonomy' => 'product_cat',
                    'field' => 'term_id',
                    'terms' => array_map('intval', $product_cat),
                );
            }
            if (!empty($product_tag)) {
                $tax_query[] = array(
                    'taxonomy' => 'product_tag',
                    'field' => 'term_id',
                    'terms' => array_map('intval', $product_tag),
                );
            }
            if (!empty($type)) {
                $tax_query[] = array(
                    'taxonomy' => 'product_type',
                    'field' => 'slug',
                    'terms' => array_map('sanitize_title', $type),
                );
            }
            if (!empty($tax_filters)) {
                foreach ($tax_filters as $taxonomy => $term_ids) {
                    $taxonomy = ltrim(urldecode($taxonomy), '_');
                    if (!taxonomy_exists($taxonomy))
                        continue;
                    $tax_query[] = array(
                        'taxonomy' => $taxonomy,
                        'field' => 'term_id',
                        'terms' => array_map('intval', (array) $term_ids),
                    );
                }
            }
            if (count($tax_query) > 1) {
                $args['tax_query'] = $tax_query;
            }

            return $args;
        }
        // In class Whizmanage_rest_functions_product – replace this entire function
        public function whizmanage_get_product(WP_REST_Request $request)
        {
            $method = $request->get_method();
            $getter = new Whizmanage_get_product();

            // --- POST: By specific IDs ---
            if ($method === 'POST') {
                $product_ids = $request->get_param('product_ids');
                if (!is_array($product_ids)) {
                    return new WP_REST_Response(['error' => 'Invalid input. Please provide an array of product IDs.'], 400);
                }

                // Clear WooCommerce product cache - important after duplication
                foreach ($product_ids as $pid) {
                    $pid = intval($pid);
                    // Clear WooCommerce object cache
                    wc_delete_product_transients($pid);
                    // Clear internal WordPress cache
                    wp_cache_delete($pid, 'posts');
                    wp_cache_delete($pid, 'post_meta');
                    // Clear children cache (important for variations!)
                    delete_transient('wc_product_children_' . $pid);
                    wp_cache_delete('wc_product_children_' . $pid, 'product_variations');
                }

                $json = $getter->get_products($product_ids, 0, count($product_ids), []);
                $rows = json_decode($json, true);
                if (!is_array($rows))
                    $rows = [];

                return new WP_REST_Response([
                    'ok' => true,
                    'page' => 1,
                    'per_page' => count($rows),
                    'total' => count($rows),
                    'total_pages' => 1,
                    'rows' => $rows,
                    'applied' => ['ids' => array_map('intval', $product_ids)],
                ], 200);
            }

            // --- GET with filters + pagination ---
            $page = max(1, intval($request->get_param('page') ?: 1));
            $per_page = $request->get_param('per_page') ?: $request->get_param('perPage');
            $per_page = max(1, min(2000, $per_page ? intval($per_page) : 1000));
            $offset = ($page - 1) * $per_page;

            // Helper to convert values to IDs
            $to_int_array = function ($val) {
                if (is_array($val)) {
                    return array_values(array_filter(array_map('intval', $val), 'is_int'));
                }
                if (is_string($val)) {
                    $parts = array_map('trim', explode(',', $val));
                    return array_values(array_filter(array_map('intval', $parts), 'is_int'));
                }
                return [];
            };

            // Build tax_filters from tax_filters and any tax__{taxonomy} param
            $tax_filters = [];
            $raw_tax_filters = $request->get_param('tax_filters');
            if (is_array($raw_tax_filters)) {
                foreach ($raw_tax_filters as $tx => $ids) {
                    $tx_clean = ltrim(urldecode($tx), '_');
                    $tax_filters[$tx_clean] = $to_int_array($ids);
                }
            }
            foreach ($_GET as $key => $val) {
                if (strpos($key, 'tax__') === 0) {
                    $tx = ltrim(urldecode(substr($key, 5)), '_');
                    $tax_filters[$tx] = $to_int_array($val);
                }
            }

            // Filters as sent (return them as is)
            $filters_applied = [
                'search' => $request->get_param('search') ?: null,
                'status' => $request->get_param('status') ? (array) $request->get_param('status') : [],
                'type' => $request->get_param('type') ? (array) $request->get_param('type') : [],
                'downloadable' => $request->get_param('downloadable') ?: null,
                'stock_status' => $request->get_param('stock_status') ? (array) $request->get_param('stock_status') : [],
                'stock_quantity' => $request->get_param('stock_quantity') !== null && $request->get_param('stock_quantity') !== ''
                    ? $request->get_param('stock_quantity')
                    : null,
                'product_cat' => $to_int_array($request->get_param('product_cat')),
                'product_tag' => $to_int_array($request->get_param('product_tag')),
                'tax_filters' => $tax_filters,
            ];

            // For actual query – internal status defaults
            $filters_for_query = $filters_applied;
            if (empty($filters_for_query['status'])) {
                $filters_for_query['status'] = ['publish', 'draft', 'pending', 'future', 'private'];
            }

            // ===== Prep for count: same WHERE as data =====
            // Mark to use LIKE on title
            $title_like_filter = null;
            $force_title_like_flag = false;
            if (!empty($filters_for_query['search'])) {
                $force_title_like_flag = true;
            }

            // Build args for count
            $count_args = $this->build_args_for_products_query($filters_for_query, 0, 1, 'ids', false);
            if ($force_title_like_flag) {
                $count_args['whizmanage_force_title_like'] = true;
                add_filter('posts_where', $title_like_filter = function ($where, \WP_Query $q) use ($filters_for_query) {
                    if (!$q->get('whizmanage_force_title_like'))
                        return $where;
                    global $wpdb;
                    $search = (string) $filters_for_query['search'];
                    $like = '%' . $wpdb->esc_like($search) . '%';
                    $where .= $wpdb->prepare(" OR ({$wpdb->posts}.post_title LIKE %s)", $like);
                    return $where;
                }, 10, 2);
            }

            // If search affects variations – add parents for count too
            if (!empty($filters_for_query['search'])) {
                $variation_ids = get_posts(array(
                    'post_type' => 'product_variation',
                    'post_status' => $filters_for_query['status'],
                    'posts_per_page' => -1,
                    'fields' => 'ids',
                    's' => $filters_for_query['search'],
                ));
                if (!empty($variation_ids)) {
                    $parent_ids = array_unique(array_filter(array_map(function ($vid) {
                        return (int) get_post_field('post_parent', $vid);
                    }, $variation_ids)));
                    if (!empty($parent_ids)) {
                        $count_args['post__in'] = isset($count_args['post__in'])
                            ? array_values(array_unique(array_merge((array) $count_args['post__in'], $parent_ids)))
                            : $parent_ids;
                    }
                }
            }

            // Count
            $q = new WP_Query($count_args);
            $total = intval($q->found_posts);

            if ($title_like_filter) {
                remove_filter('posts_where', $title_like_filter, 10);
            }

            // ===== Fetch actual data (same filters, with new implementation inside get_products) =====
            $json_rows = $getter->get_products([], $offset, $per_page, $filters_for_query);
            $rows = json_decode($json_rows, true);
            if (!is_array($rows))
                $rows = [];

            $payload = [
                'ok' => true,
                'page' => $page,
                'per_page' => $per_page,
                'total' => $total,
                'total_pages' => $per_page ? (int) ceil($total / $per_page) : 1,
                'rows' => $rows,
                'applied' => $filters_applied,
            ];

            return new WP_REST_Response($payload, 200);
        }

        public function whizmanage_get_product_for_coupons(WP_REST_Request $request)
        {
            $get_all_product = new Whizmanage_get_product();
            // Page and per_page parameters
            $page = $request->get_param('page') ? intval($request->get_param('page')) : 1;
            $per_page = $request->get_param('perPage') ? intval($request->get_param('perPage')) : 1000;

            // Calculate offset
            $offset = ($page - 1) * $per_page;

            // Get all products with offset and limit
            $res = $get_all_product->get_products_for_coupons(array(), $offset, $per_page);

            // Return the result
            return new WP_REST_Response($res, 200);
        }


        public function custom_plugin_check_permissions()
        {
            // Implement custom permission checks here
            // return current_user_can('manage_options');
            // if (!is_ssl()) {
            //     return new WP_Error('rest_forbidden', esc_html__('Only accessible over HTTPS', 'whizmanage'), array('status' => 403));
            // }
            // Check if the current user is an administrator or shop manageror custom role
            if (current_user_can('manage_options') || current_user_can('manage_woocommerce') || current_user_can('use_whizmanage')) {
                return true;
            }

            // If the user does not meet the conditions, return an error
            return new WP_Error(
                'rest_forbidden',
                esc_html__('You do not have permissions to access this.', 'whizmanage'),
                array(
                    'status' => 403,
                    'debug_user_id' => get_current_user_id(),
                    'debug_roles' => wp_get_current_user()->roles,
                    'debug_caps' => wp_get_current_user()->allcaps,
                )
            );
        }

        function is_ssl()
        {
            if (isset($_SERVER['HTTPS']) && ('on' == $_SERVER['HTTPS'] || '1' == $_SERVER['HTTPS'])) {
                return true;
            } elseif (isset($_SERVER['SERVER_PORT']) && ('443' == $_SERVER['SERVER_PORT'])) {
                return true;
            }
            return false;
        }
    }
}
