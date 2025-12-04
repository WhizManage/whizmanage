<?php

/**
 * REST API: Core endpoints for WhizManage (columns, license, history, logout)
 *
 * - Proper validation/sanitization for all inputs.
 * - Consistent JSON encoding with wp_json_encode.
 * - Permission checks limited to admins/shop managers.
 * - Stable response shapes, meaningful HTTP codes.
 * - Backward compatibility where reasonable (e.g., /columns POST array payload).
 */

if (! defined('ABSPATH')) {
	exit;
}

if (! class_exists('Whizmanage_rest_functions_main')) {

	class Whizmanage_rest_functions_main
	{

		/** @var string Main app table name */
		private $table_main;

		/** @var string History table name */
		private $table_history;

		public function __construct()
		{
			add_action('rest_api_init', array($this, 'register_routes'));

			global $wpdb;
			$this->table_main    = $wpdb->prefix . 'whizmanage';
			$this->table_history = $wpdb->prefix . 'wm_history';
		}

		/**
		 * Register all REST routes under /whizmanage/v1
		 */
		public function register_routes()
		{

			// Columns (CRUD-lite)
			register_rest_route('whizmanage/v1', '/columns', array(
				array(
					'methods'             => WP_REST_Server::READABLE,  // GET
					'callback'            => array($this, 'columns_get_all'),
					'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE, // POST
					'callback'            => array($this, 'columns_create_many'),
					'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
				),
			));

			register_rest_route('whizmanage/v1', '/columns/(?P<name>[A-Za-z0-9_\-]+)', array(
				array(
					'methods'             => WP_REST_Server::READABLE,  // GET one
					'callback'            => array($this, 'columns_get_by_name'),
					'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,  // PUT
					'callback'            => array($this, 'columns_update_by_name'),
					'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
				),
			));



			register_rest_route('whizmanage/v1', '/log_out', array(
				'methods'             => WP_REST_Server::READABLE, // GET
				'callback'            => array($this, 'log_out'),
				'permission_callback' => function () {
					return is_user_logged_in();
				},
			));


			// History (list/add/delete)
			register_rest_route('whizmanage/v1', '/history', array(
				array(
					'methods'             => WP_REST_Server::READABLE, // GET with optional pagination
					'callback'            => array($this, 'wm_history_get_items'),
					'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
					'args'                => array(
						'page' => array(
							'type'        => 'integer',
							'default'     => 1,
							'minimum'     => 1,
							'description' => 'Page number (1-based).',
						),
						'per_page' => array(
							'type'        => 'integer',
							'default'     => 20,
							'minimum'     => 1,
							'maximum'     => 100,
							'description' => 'Items per page.',
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE, // POST
					'callback'            => array($this, 'wm_history_add_item'),
					'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
				),
			));

			register_rest_route('whizmanage/v1', '/history/delete', array(
				'methods'             => WP_REST_Server::CREATABLE, // POST
				'callback'            => array($this, 'wm_history_delete_items'),
				'permission_callback' => array($this, 'permission_admin_or_shop_manager'),
			));

			// NOTE: /history/restore removed (no server-side implementation was provided).
		}

		/* ---------------------------------------------------------------------
		 * Columns endpoints
		 * -------------------------------------------------------------------*/

		/**
		 * GET /whizmanage/v1/columns
		 * Returns all rows; reservedData is decoded to array/object when possible.
		 */
		public function columns_get_all(WP_REST_Request $request)
		{
			global $wpdb;

			$table = $this->table_main;

			$rows = $wpdb->get_results(
				"SELECT * FROM `{$table}`",
				ARRAY_A
			);

			if (! is_array($rows)) {
				return new WP_Error('db_error', 'Database error', array('status' => 500));
			}

			foreach ($rows as &$row) {
				$row['reservedData'] = $this->maybe_json_decode($row['reservedData']);
			}

			return rest_ensure_response($rows);
		}


		/**
		 * POST /whizmanage/v1/columns
		 * Body (preferred): { "items": [ { "name": "...", "reservedData": ... }, ... ] }
		 * Back-compat: also accepts a bare array [ {...}, ... ] as in older versions.
		 * Inserts new records by unique "name". Does NOT overwrite existing entries.
		 */
		public function columns_create_many(WP_REST_Request $request)
		{
			global $wpdb;

			$params = $request->get_json_params();
			$items  = array();

			// Back-compat: Accept a bare array payload
			if (is_array($params) && isset($params[0]) && is_array($params[0]) && ! isset($params['items'])) {
				$items = $params;
			} else {
				$items = (isset($params['items']) && is_array($params['items'])) ? $params['items'] : array();
			}

			if (empty($items)) {
				return new WP_Error('invalid_data', 'Invalid data format. Expected { items: [...] } or an array.', array('status' => 400));
			}

			$responses = array();

			foreach ($items as $item) {
				$name    = isset($item['name']) ? sanitize_text_field($item['name']) : '';
				$message = array_key_exists('reservedData', $item) ? $item['reservedData'] : null;

				if ($name && null !== $message) {
					$table  = $this->table_main;
					$exists = (int) $wpdb->get_var(
						$wpdb->prepare(
							"SELECT COUNT(*) FROM `{$table}` WHERE name = %s",
							$name
						)
					);


					if (0 === $exists) {
						$inserted = $wpdb->insert(
							$this->table_main,
							array(
								'name'         => $name,
								'reservedData' => wp_json_encode($message, JSON_UNESCAPED_UNICODE),
							),
							array('%s', '%s')
						);
						$responses[] = array(
							'name'   => $name,
							'status' => $inserted ? 'added' : 'db_error',
						);
					} else {
						$responses[] = array('name' => $name, 'status' => 'duplicate');
					}
				} else {
					$responses[] = array('name' => $name, 'status' => 'invalid');
				}
			}

			return rest_ensure_response($responses);
		}

		/**
		 * GET /whizmanage/v1/columns/{name}
		 */
		public function columns_get_by_name(WP_REST_Request $request)
		{
			global $wpdb;

			$name  = sanitize_text_field($request->get_param('name'));
			$table = $this->table_main;

			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM `{$table}` WHERE name = %s",
					$name
				),
				ARRAY_A
			);

			if (! $row) {
				return new WP_Error('not_found', 'Record not found', array('status' => 404));
			}

			$row['reservedData'] = $this->maybe_json_decode($row['reservedData']);
			return rest_ensure_response($row);
		}

		/**
		 * PUT /whizmanage/v1/columns/{name}
		 * Body: { "reservedData": ... }
		 * Updates reservedData for a given name. Does not create new rows.
		 */
		public function columns_update_by_name(WP_REST_Request $request)
		{
			global $wpdb;

			$name   = sanitize_text_field($request->get_param('name'));
			$params = $request->get_json_params();

			if (! array_key_exists('reservedData', $params)) {
				return new WP_Error('invalid_data', 'Missing reservedData', array('status' => 400));
			}

			$updated = $wpdb->update(
				$this->table_main,
				array('reservedData' => wp_json_encode($params['reservedData'], JSON_UNESCAPED_UNICODE)),
				array('name' => $name),
				array('%s'),
				array('%s')
			);

			if (false === $updated) {
				return new WP_Error('db_error', 'Database update failed', array('status' => 500));
			}

			return rest_ensure_response(
				array(
					'name'         => $name,
					'reservedData' => $params['reservedData'],
					'updated'      => (int) $updated,
				)
			);
		}

		/* ---------------------------------------------------------------------
		 * Logout
		 * -------------------------------------------------------------------*/

		/**
		 * GET /whizmanage/v1/log_out
		 * Logs out the current user if logged in. Always returns 204 (no content).
		 */
		public function log_out()
		{
			if (is_user_logged_in()) {
				wp_logout();
			}
			return new WP_REST_Response(null, 204);
		}

		/* ---------------------------------------------------------------------
		 * History endpoints
		 * -------------------------------------------------------------------*/

		/**
		 * GET /whizmanage/v1/history?page=1&per_page=20
		 * Returns paginated history entries (decoded items).
		 */
		public function wm_history_get_items(WP_REST_Request $request)
		{
			global $wpdb;

			$page     = max(1, (int) $request->get_param('page'));
			$per_page = min(100, max(1, (int) $request->get_param('per_page')));
			$offset   = ($page - 1) * $per_page;

			$table = esc_sql($this->table_history);

			$total = (int) $wpdb->get_var("SELECT COUNT(*) FROM `{$table}`");

			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT * FROM `{$table}` ORDER BY `date` DESC LIMIT %d OFFSET %d",
					$per_page,
					$offset
				),
				ARRAY_A
			);


			if (! is_array($rows)) {
				return new WP_Error('db_error', 'Database error', array('status' => 500));
			}

			foreach ($rows as &$row) {
				$row['items'] = $this->maybe_json_decode($row['items'], true);
			}

			$response = array(
				'page'        => $page,
				'per_page'    => $per_page,
				'total'       => $total,
				'total_pages' => (int) ceil($total / $per_page),
				'data'        => $rows,
			);

			return new WP_REST_Response($response, 200);
		}

		/**
		 * POST /whizmanage/v1/history
		 * Body: { "location": "...", "action": "...", "items": [...] }
		 * Stores a new history record and keeps the table capped (max 50).
		 */
		public function wm_history_add_item(WP_REST_Request $request)
		{
			global $wpdb;

			$params   = $request->get_json_params();
			$max_rows = 50;

			$location = isset($params['location']) ? sanitize_text_field($params['location']) : '';
			$action   = isset($params['action']) ? sanitize_text_field($params['action']) : '';
			$items    = isset($params['items']) ? $params['items'] : array();

			$current_user = wp_get_current_user();
			$user_name    = ($current_user && $current_user->exists()) ? $current_user->user_login : 'guest';

			$inserted = $wpdb->insert(
				$this->table_history,
				array(
					'location' => $location,
					'action'   => $action,
					'items'    => wp_json_encode($items, JSON_UNESCAPED_UNICODE),
					'user'     => $user_name,
					'date'     => current_time('mysql'),
				),
				array('%s', '%s', '%s', '%s', '%s')
			);

			if (! $inserted) {
				return new WP_REST_Response(
					array('success' => false, 'error' => $wpdb->last_error),
					500
				);
			}

			// Enforce cap: keep only latest N rows
			// Enforce cap: keep only latest N rows
			$table = $this->table_history;

			$total = (int) $wpdb->get_var("SELECT COUNT(*) FROM `{$table}`");
			if ($total > $max_rows) {
				$to_delete = $total - $max_rows;

				$wpdb->query(
					$wpdb->prepare(
						"DELETE FROM `{$table}` ORDER BY `date` ASC LIMIT %d",
						$to_delete
					)
				);
			}


			return new WP_REST_Response(array('success' => true), 201);
		}

		/**
		 * POST /whizmanage/v1/history/delete
		 * Body: { "ids": [1,2,3] }
		 * Deletes multiple history rows by ID using a single IN() query.
		 */
		public function wm_history_delete_items(WP_REST_Request $request)
		{
			global $wpdb;

			$params = $request->get_json_params();
			$ids    = (isset($params['ids']) && is_array($params['ids']))
				? array_map('intval', $params['ids'])
				: array();

			if (empty($ids)) {
				return new WP_REST_Response(
					array('success' => false, 'error' => 'IDs missing'),
					400
				);
			}

			// sanitize table name
			$table = $this->table_history;

			// build placeholders for IDs
			$placeholders = implode(',', array_fill(0, count($ids), '%d'));

			// run prepared query directly (no $sql variable)
			$deleted = $wpdb->query(
				$wpdb->prepare(
					"DELETE FROM `{$table}` WHERE id IN ($placeholders)",
					$ids
				)
			);


			if (false === $deleted) {
				return new WP_REST_Response(
					array('success' => false, 'error' => $wpdb->last_error),
					500
				);
			}

			return new WP_REST_Response(
				array('success' => true, 'deleted' => (int) $deleted),
				200
			);
		}


		/* ---------------------------------------------------------------------
		 * Permissions & Utilities
		 * -------------------------------------------------------------------*/

		/**
		 * Permission: allow admins or shop managers.
		 * If you want to enforce HTTPS on the API level, you can add an is_ssl() check here.
		 */
		public function permission_admin_or_shop_manager()
		{
			if (current_user_can('manage_options') || current_user_can('manage_woocommerce')) {
				return true;
			}
			return new WP_Error(
				'rest_forbidden',
				__('You do not have permissions to access this.', 'whizmanage'),
				array('status' => 403)
			);
		}

		/**
		 * Safely decode a JSON string when it looks like JSON; otherwise return value as-is.
		 *
		 * @param mixed $val String (JSON?) or other values.
		 * @param bool  $assoc Return associative array if true.
		 * @return mixed
		 */
		private function maybe_json_decode($val, $assoc = true)
		{
			if (is_string($val)) {
				$first = substr($val, 0, 1);
				if (in_array($first, array('{', '[', '"'), true)) {
					$decoded = json_decode($val, $assoc);
					return (null === $decoded) ? $val : $decoded;
				}
			}
			return $val;
		}
	}
}
