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
				'/trash-products/',
				array(
					'methods'             => 'POST',
					'callback'            => array($this, 'trash_products'),
					'permission_callback' => array($this, 'custom_plugin_check_permissions'),
				)
			);

	

			register_rest_route(
				'whizmanage/v1',
				'/upload-images',
				array(
					'methods'             => 'POST',
					'callback'            => array($this, 'handle_image_upload'),
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
				'/media-by-url',
				array(
					'methods'             => 'POST',
					'callback'            => array($this, 'get_media_by_urls'),
					'permission_callback' => array($this, 'custom_plugin_check_permissions'),
				)
			);

		}

		/**
		 * Resolve media attachment IDs by a list of URLs.
		 * Returns: [{ id, title, src } | { id:null, message }]
		 */
		public function get_media_by_urls($request)
		{
			$urls = $request->get_param('urls');

			if (empty($urls) || ! is_array($urls)) {
				return new WP_REST_Response(
					array('message' => 'Invalid URLs parameter'),
					400
				);
			}

			$results = array();

			foreach ($urls as $url) {
				$decoded_url    = urldecode($url);
				$attachment_id  = attachment_url_to_postid($decoded_url);

				if (! $attachment_id) {
					$results[] = array(
						'url'     => $decoded_url,
						'message' => 'Media not found',
						'id'      => null,
					);
					continue;
				}

				$attachment = get_post($attachment_id);
				if (! $attachment) {
					$results[] = array(
						'url'     => $decoded_url,
						'message' => 'Media not found',
						'id'      => null,
					);
					continue;
				}

				$results[] = array(
					'id'    => $attachment->ID,
					'title' => $attachment->post_title,
					'src'   => wp_get_attachment_url($attachment->ID),
				);
			}

			// Small standardization: ensure REST response wrapper.
			return rest_ensure_response($results);
		}

		/**
		 * List terms for a taxonomy (with simple shaping).
		 */
		public function get_terms_by_taxonomy($request)
		{
			$taxonomy = $this->clean_taxonomy_name($request->get_param('taxonomy'));



			if (! taxonomy_exists($taxonomy)) {
				return new WP_Error('invalid_taxonomy', 'הטקסונומיה לא קיימת', array('status' => 404));
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
				return new WP_Error('term_not_found', 'המונח לא נמצא.', array('status' => 404));
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
				return new WP_Error('term_not_found', 'המונח לא נמצא או לא ניתן למחוק אותו.', array('status' => 404));
			}

			return rest_ensure_response(
				array(
					'status'  => 'success',
					'message' => 'המונח נמחק בהצלחה.',
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

		/**
		 * Trash or permanently delete products in bulk.
		 */
		public function trash_products($request)
		{
			$product_ids        = $request->get_param('product_ids');
			$delete_permanently = $request->get_param('delete_permanently');

			$processed_ids = array(
				'trashed' => array(),
				'deleted' => array(),
			);

			if (empty($product_ids) || ! is_array($product_ids)) {
				return rest_ensure_response(
					array('message' => 'Error processing products.')
				);
			}

			foreach ($product_ids as $product_id) {
				$product = wc_get_product($product_id);

				if ($product) {
					if ($delete_permanently) {
						wp_delete_post($product_id, true);
						$processed_ids['deleted'][] = $product_id;
					} else {
						wp_trash_post($product_id);
						$processed_ids['trashed'][] = $product_id;
					}
				}
			}

			return rest_ensure_response(
				array(
					'message'       => 'Products processed successfully.',
					'processed_ids' => $processed_ids,
				)
			);
		}

		/**
		 * Create/update variations for a variable product.
		 * Minimal validation retained to keep behavior stable.
		 */
		public function handle_add_variations($request)
		{
			$variations_data = $request->get_param('variations_data');

			if (! is_array($variations_data)) {
				return new WP_Error('invalid_data', 'Invalid data provided', array('status' => 400));
			}

			$new_variation_ids = array();
			$errors            = array();

			foreach ($variations_data as $variation_data) {
				try {
					$variation_id = isset($variation_data['id']) ? $variation_data['id'] : 0;

					// Load existing variation or create a new one under a variable product.
					if ($variation_id) {
						$variation = wc_get_product($variation_id);

						if (! $variation || ! $variation->is_type('variation')) {
							throw new Exception('Variation ID ' . $variation_id . ' is not valid.');
						}
					} else {
						$product_id = $variation_data['parent_id'];
						$product    = wc_get_product($product_id);

						if (! $product || ! $product->is_type('variable')) {
							throw new Exception('Product ID ' . $product_id . ' is not a valid variable product.');
						}

						$variation = new WC_Product_Variation();
						$variation->set_parent_id($product_id);
					}

					// Map attributes (sanitize slug + option).
					if (! empty($variation_data['attributes']) && is_array($variation_data['attributes'])) {
						$attributes = array();

						foreach ($variation_data['attributes'] as $attribute) {
							if (! empty($attribute['name']) && ! empty($attribute['option'])) {
								$attribute_slug = sanitize_title(urldecode($attribute['slug']));
								$option         = sanitize_title(urldecode($attribute['option']));

								if (! empty($attribute_slug) && ! empty($option)) {
									$attributes[$attribute_slug] = $option;
								}
							}
						}
						$variation->set_attributes($attributes);
					}

					// Basic fields (kept as-is to avoid broader type coercion changes).
					$variation->set_regular_price($variation_data['regular_price']);
					$variation->set_sale_price($variation_data['sale_price']);
					$variation->set_stock_quantity($variation_data['stock_quantity']);
					$variation->set_manage_stock($variation_data['manage_stock']);
					$variation->set_stock_status($variation_data['stock_status']);
					$variation->set_date_on_sale_from($variation_data['date_on_sale_from_gmt']);
					$variation->set_date_on_sale_to($variation_data['date_on_sale_to_gmt']);
					$variation->set_length($variation_data['dimensions']['length']);
					$variation->set_width($variation_data['dimensions']['width']);
					$variation->set_height($variation_data['dimensions']['height']);
					$variation->set_downloadable($variation_data['downloadable']);
					$variation->set_virtual($variation_data['virtual']);
					$variation->set_weight($variation_data['weight']);
					$variation->set_tax_status($variation_data['tax_status']);
					$variation->set_tax_class($variation_data['tax_class']);
					$variation->set_description($variation_data['description']);
					$variation->set_menu_order($variation_data['menu_order']);

					// SKU: set only if not used elsewhere (preserve your existing logic).
					$sku = $variation_data['sku'];
					if (! empty($sku)) {
						$existing_product_id = wc_get_product_id_by_sku($sku);
						if (! $existing_product_id || $existing_product_id === $variation->get_id()) {
							$variation->set_sku($sku);
						} else {
						}
					}

				    // --- ✅ התיקון לתמונות: תמיכה ב-ID קיים ---
                    if (!empty($variation_data['image']['id'])) {
                        // אם נשלח ID של תמונה (מה שקורה בדרך כלל בעריכה)
                        $variation->set_image_id($variation_data['image']['id']);
                    } 


					// Meta data passthrough.
					if (! empty($variation_data['meta_data'])) {
						foreach ($variation_data['meta_data'] as $meta) {
							if (! empty($meta['key']) && isset($meta['value'])) {
								$variation->update_meta_data($meta['key'], $meta['value']);
							}
						}
					}

					$variation->save();
					$new_variation_ids[] = $variation->get_id();
				} catch (Exception $e) {
					$errors[] = $e->getMessage();
				}
			}

			return rest_ensure_response(
				array(
					'new_variation_ids' => $new_variation_ids,
					'errors'            => $errors,
				)
			);
		}


		/**
		 * Fetch products for grid/table. Supports POST with product_ids (array) or GET with page/perPage.
		 */
		public function whizmanage_get_product(WP_REST_Request $request)
		{
			$method          = $request->get_method();
			$get_all_product = new Whizmanage_get_product();

			if ('POST' === $method) {
				$product_ids = $request->get_param('product_ids');

				if (! is_array($product_ids)) {
					return new WP_REST_Response(
						array('error' => 'Invalid input. Please provide an array of product IDs.'),
						400
					);
				}
				$list_producs	= $get_all_product->get_products($product_ids);
				$res = wp_json_encode($list_producs);
			} else {
				$page     = $request->get_param('page') ? intval($request->get_param('page')) : 1;
				$per_page = $request->get_param('perPage') ? intval($request->get_param('perPage')) : 1000;
				$offset   = ($page - 1) * $per_page;

				$list_producs = $get_all_product->get_products(array(), $offset, $per_page);
				$res = wp_json_encode($list_producs);
			}

			return new WP_REST_Response($res, 200);
		}

		/**
		 * Lightweight product list for coupons UI (public per your original endpoint).
		 */
		public function whizmanage_get_product_for_coupons(WP_REST_Request $request)
		{
			$get_all_product = new Whizmanage_get_product();

			$page     = $request->get_param('page') ? intval($request->get_param('page')) : 1;
			$per_page = $request->get_param('perPage') ? intval($request->get_param('perPage')) : 1000;
			$offset   = ($page - 1) * $per_page;

			$res = $get_all_product->get_products_for_coupons(array(), $offset, $per_page);

			return new WP_REST_Response($res, 200);
		}

		/**
		 * Permission callback used by most endpoints (admins & shop managers).
		 */
		public function custom_plugin_check_permissions()
		{
			// Align with WooCommerce roles: Admins and Shop Managers allowed.
			if (current_user_can('manage_options') || current_user_can('manage_woocommerce')) {
				return true;
			}

			return new WP_Error(
				'rest_forbidden',
				esc_html__('You do not have permissions to access this.', 'whizmanage'),
				array('status' => 403)
			);
		}

		/**
		 * Local fallback for SSL detection (kept for backward compatibility in this class).
		 * Note: WordPress has `is_ssl()` globally — not used here to avoid naming conflict.
		 */
		public function is_ssl()
		{
			if (isset($_SERVER['HTTPS']) && ('on' === $_SERVER['HTTPS'] || '1' === $_SERVER['HTTPS'])) {
				return true;
			} elseif (isset($_SERVER['SERVER_PORT']) && ('443' === $_SERVER['SERVER_PORT'])) {
				return true;
			}
			return false;
		}
	}
}
